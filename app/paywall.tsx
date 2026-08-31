import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Web checkout, not IAP ────────────────────────────────────────────────────
// Subscriptions are purchased on the web (Stripe) and unlock the app through
// Supabase: the Stripe webhook writes profiles.tier, and useSubscription
// re-reads it when the app foregrounds — so returning from Safari after
// paying updates entitlement automatically. There is deliberately no IAP in
// this app; do not reintroduce react-native-purchases-ui (it broke the New
// Architecture build in May 2026). External-purchase links are permitted on
// the US storefront post Epic v. Apple — re-check the current App Review
// Guidelines at each submission.

const UPGRADE_URL = 'https://app.pursuearete.com/upgrade';

interface PlanDisplay {
  identifier: string;
  label: string;
  price: string;
  period: string;
  badge: string | null;
  highlighted: boolean;
  description: string;
}

const PLAN_DISPLAY: PlanDisplay[] = [
  {
    identifier: 'premium_monthly',
    label: 'Arete',
    price: '$9.99',
    period: '/mo',
    badge: null,
    highlighted: false,
    description: '50 messages/day · All 23 counselors · Shared sessions',
  },
  {
    identifier: 'premium_yearly',
    label: 'Arete Annual',
    price: '$79.99',
    period: '/yr',
    badge: 'BEST VALUE',
    highlighted: true,
    description: '$6.67/mo · Save 33% · Everything in Arete',
  },
  {
    identifier: 'pro_monthly',
    label: 'Arete Pro',
    price: '$19.99',
    period: '/mo',
    badge: 'UNLIMITED',
    highlighted: false,
    description: 'Unlimited messages · Deepest reasoning · Model choice',
  },
];

const FEATURES = [
  { label: 'Messages/day',     free: '10',       arete: '50',     pro: 'Unlimited' },
  { label: 'Counselors',       free: '3',        arete: '23',     pro: '23' },
  { label: 'Reasoning depth',  free: 'Standard', arete: 'Deeper', pro: 'Deepest' },
  { label: 'Custom cabinet',   free: '—',        arete: '✓',      pro: '✓' },
  { label: 'Shared sessions',  free: '—',        arete: '✓',      pro: '✓' },
  { label: 'Weekly insights',  free: 'Preview',  arete: 'Full',   pro: 'Full' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ src?: string }>();
  const loggedRef = useRef(false);

  // Funnel telemetry: one row per view, labeled with what triggered it, so we
  // can see which gate actually converts. Fire-and-forget; never blocks UI.
  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('paywall_events').insert({
          user_id: user.id,
          source: params.src ? String(params.src) : 'unknown',
        });
      } catch { /* telemetry is best-effort */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openWebCheckout = () => {
    WebBrowser.openBrowserAsync(UPGRADE_URL).catch(() => {});
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Dismiss button */}
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={() => router.back()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="close" size={22} color="#8A9BB0" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Arete</Text>
          <Text style={styles.title}>Unlock Your Cabinet</Text>
          <Text style={styles.subtitle}>
            More counselors. More conversations.{'\n'}The discipline to actually use them.
          </Text>
          <Text style={styles.trialLine}>New members start with a 7-day free trial</Text>
        </View>

        {/* Feature comparison table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableLabel]} />
            <Text style={[styles.tableCell, styles.tableColHeader]}>Free</Text>
            <Text style={[styles.tableCell, styles.tableColHeader]}>Arete</Text>
            <Text style={[styles.tableCell, styles.tableColHeader, styles.tableColGold]}>Pro</Text>
          </View>
          {FEATURES.map((row, i) => (
            <View key={row.label} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
              <Text style={[styles.tableCell, styles.tableLabel]}>{row.label}</Text>
              <Text style={[styles.tableCell, styles.tableValue]}>{row.free}</Text>
              <Text style={[styles.tableCell, styles.tableValue]}>{row.arete}</Text>
              <Text style={[styles.tableCell, styles.tableValue, styles.tableColGold]}>{row.pro}</Text>
            </View>
          ))}
        </View>

        {/* Plan cards — informational; purchase happens on the web */}
        <View style={styles.plansContainer}>
          {PLAN_DISPLAY.map(plan => (
            <TouchableOpacity
              key={plan.identifier}
              style={[styles.planCard, plan.highlighted && styles.planCardHighlighted]}
              onPress={openWebCheckout}
              activeOpacity={0.8}
            >
              {plan.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{plan.badge}</Text>
                </View>
              )}

              <View style={styles.planRow}>
                <View style={styles.planInfo}>
                  <Text style={styles.planLabel}>{plan.label}</Text>
                  <Text style={styles.planDescription}>{plan.description}</Text>
                </View>

                <View style={styles.planPriceBlock}>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA — opens the web checkout */}
        <TouchableOpacity style={styles.subscribeButton} onPress={openWebCheckout} activeOpacity={0.85}>
          <Text style={styles.subscribeButtonText}>Subscribe on the Web</Text>
        </TouchableOpacity>

        <Text style={styles.syncNote}>
          Payment is handled securely at pursuearete.com.{'\n'}
          Your subscription unlocks this app automatically.
        </Text>

        <Text style={styles.legal}>
          Subscriptions auto-renew. Manage or cancel anytime from your account on the web.
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const NAVY   = '#0A1628';
const GOLD   = '#C9A84C';
const SURFACE = '#0F1E38';
const BORDER  = '#1E3050';
const MUTED   = '#8A9BB0';
const TEXT    = '#E8EDF5';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
  },
  dismissButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 12,
  },
  eyebrow: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: TEXT,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  trialLine: {
    color: '#c9a84c',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },

  // Table
  tableContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableRowAlt: {
    backgroundColor: '#0D1A30',
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    color: TEXT,
    textAlign: 'center',
  },
  tableLabel: {
    textAlign: 'left',
    color: MUTED,
    flex: 1.4,
  },
  tableColHeader: {
    color: MUTED,
    fontWeight: '600',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableColGold: {
    color: GOLD,
  },
  tableValue: {
    color: TEXT,
    fontSize: 12,
  },

  // Plans
  plansContainer: {
    gap: 10,
    marginBottom: 20,
  },
  planCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    backgroundColor: SURFACE,
    padding: 16,
  },
  planCardHighlighted: {
    borderColor: GOLD + '55',
    backgroundColor: '#0F1E38',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: GOLD,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 10,
  },
  badgeText: {
    color: NAVY,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planInfo: {
    flex: 1,
  },
  planLabel: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  planDescription: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
  },
  planPriceBlock: {
    alignItems: 'flex-end',
  },
  planPrice: {
    color: TEXT,
    fontSize: 17,
    fontWeight: '700',
  },
  planPeriod: {
    color: MUTED,
    fontSize: 11,
  },

  // Subscribe button
  subscribeButton: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  subscribeButtonText: {
    color: NAVY,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Web sync note
  syncNote: {
    color: MUTED,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },

  // Legal
  legal: {
    color: '#4A5A70',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
