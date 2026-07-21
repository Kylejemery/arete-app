// The longitudinal portrait — the user's own philosophical arc, read back to them.
//
// Reads user_longitudinal_models, which the weekly agent
// (server/longitudinal-user-model.js) rebuilds every Monday from the whole
// journal_analysis history. Nothing here is computed on-device; this screen is
// purely a reading surface.
//
// Deliberately restrained: prose first, serif, generous measure, no streaks, no
// scores-as-trophies, no emoji. The portrait is meant to be read once a week and
// sat with, not checked. Every section is conditional — a four-week-old account
// has emerging themes and nothing else, and that must look intentional rather
// than broken.

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getLongitudinalPortrait, getCounselorsBySlugs } from '@/lib/db';
import type { LongitudinalPortrait, LongitudinalTheme } from '@/lib/types';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

// The agent writes this exact string on a user's very first model. It carries no
// information — there is nothing to compare against yet — so we suppress the
// section rather than show a delta that says "First model generated."
const PLACEHOLDER_DELTA = 'First model generated.';

// Emerging themes can run to fifteen or more in an active week. Showing them all
// turns a portrait into a list, so we open with a handful and let the reader ask
// for the rest.
const THEMES_COLLAPSED = 5;

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

// Split the portrait prose into paragraphs. The agent writes prose with blank
// lines between paragraphs; fall back to one block if it didn't.
function paragraphsOf(prose: string): string[] {
  return prose
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function ThemeList({
  themes,
  title,
  note,
}: {
  themes: LongitudinalTheme[];
  title: string;
  note: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!themes.length) return null;

  const shown = expanded ? themes : themes.slice(0, THEMES_COLLAPSED);
  const hidden = themes.length - shown.length;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionNote}>{note}</Text>
      {shown.map((t, i) => (
        <View key={`${t.theme}-${i}`} style={styles.themeRow}>
          <View style={styles.themeMark} />
          <Text style={styles.themeText}>
            {t.theme}
            {t.weeks_seen > 1 ? (
              <Text style={styles.themeWeeks}>  ·  {t.weeks_seen} weeks</Text>
            ) : null}
          </Text>
        </View>
      ))}
      {hidden > 0 && (
        <TouchableOpacity onPress={() => setExpanded(true)} style={styles.moreButton}>
          <Text style={styles.moreText}>{hidden} more</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function PortraitScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [portrait, setPortrait] = useState<LongitudinalPortrait | null>(null);
  const [counselorNames, setCounselorNames] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        const model = await getLongitudinalPortrait();
        if (cancelled) return;
        setPortrait(model);
        setLoading(false);

        // Affinity is stored by slug; resolve display names so the section reads
        // as people rather than identifiers. Failure here is cosmetic.
        const slugs = (model?.counselor_affinity ?? []).map((a) => a.counselor);
        if (slugs.length) {
          try {
            const counselors = await getCounselorsBySlugs(slugs);
            if (cancelled) return;
            setCounselorNames(
              Object.fromEntries(counselors.map((c) => [c.slug, c.name]))
            );
          } catch {
            // Fall through to slug-cased names.
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  const header = (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.back}>
        <Ionicons name="chevron-back" size={24} color="#c9a84c" />
      </TouchableOpacity>
      <Text style={styles.title}>Portrait</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {header}
        <View style={styles.centered}>
          <ActivityIndicator color="#c9a84c" />
        </View>
      </SafeAreaView>
    );
  }

  // No row yet: the agent skips users below its four-week threshold. This is the
  // normal state for a new account, so it reads as an invitation, not a failure.
  if (!portrait || !portrait.philosophical_portrait) {
    return (
      <SafeAreaView style={styles.container}>
        {header}
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Your portrait is still forming.</Text>
          <Text style={styles.emptyBody}>
            It is written from your own journal entries, and it needs about four
            weeks of them before there is an arc worth describing. Keep writing.
            It will appear here on a Monday.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const persistent = portrait.persistent_themes ?? [];
  const emerging = portrait.emerging_themes ?? [];
  const fading = portrait.fading_themes ?? [];
  const edges = portrait.growth_edges ?? [];
  const affinity = (portrait.counselor_affinity ?? []).slice(0, 5);
  const weeks = portrait.weeks_analyzed ?? 0;
  const showDelta =
    portrait.delta_summary && portrait.delta_summary.trim() !== PLACEHOLDER_DELTA;

  return (
    <SafeAreaView style={styles.container}>
      {header}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.dek}>
          {weeks} {weeks === 1 ? 'week' : 'weeks'} of your own writing, read back to you.
        </Text>

        {/* The portrait itself — the reason this screen exists. */}
        {paragraphsOf(portrait.philosophical_portrait).map((p, i) => (
          <Text key={i} style={styles.prose}>
            {p}
          </Text>
        ))}

        {showDelta && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What moved this week</Text>
            <Text style={styles.deltaText}>{portrait.delta_summary}</Text>
          </View>
        )}

        {edges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Where you are still working</Text>
            <Text style={styles.sectionNote}>
              Questions you have returned to without settling.
            </Text>
            {edges.map((edge, i) => (
              <Text key={i} style={styles.edgeText}>
                {edge}
              </Text>
            ))}
          </View>
        )}

        <ThemeList
          themes={persistent}
          title="What persists"
          note="Present across most of the weeks you have written."
        />
        <ThemeList
          themes={emerging}
          title="What is new"
          note="Appearing for the first or second time."
        />
        <ThemeList
          themes={fading}
          title="What has quieted"
          note="Once constant, absent from your recent weeks."
        />

        {(portrait.dominant_philosophical_orientation ||
          portrait.emotional_tone_baseline ||
          portrait.self_disclosure_depth) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Register</Text>
            <View style={styles.registerRows}>
              {portrait.dominant_philosophical_orientation && (
                <View style={styles.registerRow}>
                  <Text style={styles.registerLabel}>Orientation</Text>
                  <Text style={styles.registerValue}>
                    {portrait.dominant_philosophical_orientation}
                  </Text>
                </View>
              )}
              {portrait.emotional_tone_baseline && (
                <View style={styles.registerRow}>
                  <Text style={styles.registerLabel}>Tone</Text>
                  <Text style={styles.registerValue}>
                    {portrait.emotional_tone_baseline}
                  </Text>
                </View>
              )}
              {portrait.self_disclosure_depth && (
                <View style={styles.registerRow}>
                  <Text style={styles.registerLabel}>Candor</Text>
                  <Text style={styles.registerValue}>
                    {portrait.self_disclosure_depth}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {affinity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Who you have been sitting with</Text>
            {affinity.map((a) => (
              <View key={a.counselor} style={styles.registerRow}>
                <Text style={styles.registerValue}>
                  {counselorNames[a.counselor] ?? a.counselor}
                </Text>
                <Text style={styles.registerLabel}>
                  {a.count} {a.count === 1 ? 'conversation' : 'conversations'}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.colophon}>
          Rebuilt {formatDate(portrait.portrait_updated_at ?? portrait.last_analyzed_at)}.
          Written from your journal entries alone, and visible only to you.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 20,
    paddingHorizontal: 25,
    paddingBottom: 8,
  },
  back: { marginLeft: -6 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#c9a84c' },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 28, paddingTop: 8, paddingBottom: 64 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },

  dek: {
    color: '#8a8aa0',
    fontSize: 13,
    letterSpacing: 0.3,
    marginBottom: 28,
  },

  // The prose is the hero: serif, 17/29, unhurried.
  prose: {
    fontFamily: SERIF,
    color: '#e8e8f0',
    fontSize: 17,
    lineHeight: 29,
    marginBottom: 20,
  },

  section: {
    marginTop: 20,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#c9a84c22',
  },
  sectionTitle: {
    color: '#c9a84c',
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionNote: { color: '#7a7a90', fontSize: 13, lineHeight: 20, marginBottom: 16 },

  deltaText: { fontFamily: SERIF, color: '#e8e8f0', fontSize: 16, lineHeight: 27 },

  edgeText: {
    fontFamily: SERIF,
    color: '#d8d8e4',
    fontSize: 16,
    lineHeight: 27,
    marginBottom: 16,
  },

  themeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  themeMark: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: '#c9a84c55',
  },
  themeText: { flex: 1, color: '#d8d8e4', fontSize: 15, lineHeight: 23 },
  themeWeeks: { color: '#7a7a90', fontSize: 13 },

  moreButton: { paddingVertical: 6 },
  moreText: { color: '#c9a84c', fontSize: 13, letterSpacing: 0.4 },

  registerRows: { gap: 2 },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 10,
  },
  registerLabel: { color: '#7a7a90', fontSize: 13 },
  registerValue: { color: '#e8e8f0', fontSize: 15, textTransform: 'capitalize' },

  colophon: {
    color: '#6a6a80',
    fontSize: 12,
    lineHeight: 20,
    marginTop: 36,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#c9a84c1a',
  },

  emptyTitle: {
    fontFamily: SERIF,
    color: '#e8e8f0',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 14,
  },
  emptyBody: {
    fontFamily: SERIF,
    color: '#8a8aa0',
    fontSize: 15,
    lineHeight: 26,
    textAlign: 'center',
  },
});
