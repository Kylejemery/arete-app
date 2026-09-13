import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import type { EssayStatus } from '@/lib/agora';

// The Agora's building blocks, ported from the design kit
// (.claude/skills/arete-design/components/agora). Ink and gold: flat
// #16213e cards with gold hairlines, no shadows, no avatars. A counselor's
// words get the italic-plus-3px-gold-rule treatment; a reader's do not.

export const GOLD = '#c9a84c';
export const INK = '#1a1a2e';
export const CARD = '#16213e';

export function Kicker({ children, dim, style }: { children: ReactNode; dim?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Text style={[s.kicker, dim && { color: '#c9a84c88' }]}>{children}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function EssayRow({
  title, author, meta, excerpt, tags = [], comments, counselor, kicker, onPress,
}: {
  title: string; author: string; meta?: string; excerpt?: string | null; tags?: string[];
  comments?: number; counselor?: string | null; kicker?: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={s.row}>
      {kicker ? <Text style={[s.kicker, { marginBottom: 8 }]}>{kicker}</Text> : null}
      <Text style={s.rowTitle}>{title}</Text>
      <Text style={s.rowAuthor}>
        {author}{meta ? <Text style={s.rowMeta}> · {meta}</Text> : null}
      </Text>
      {excerpt ? <Text style={s.rowExcerpt} numberOfLines={3}>{excerpt}</Text> : null}
      <View style={s.rowFoot}>
        {tags.map(t => <Text key={t} style={s.tag}>{t}</Text>)}
        {comments !== undefined && (
          <View style={s.rowComments}>
            <Ionicons name="chatbubble-outline" size={13} color="#888" />
            <Text style={s.rowCommentsText}>{comments}</Text>
          </View>
        )}
      </View>
      {counselor ? <Text style={s.answered}>{counselor} answered</Text> : null}
    </TouchableOpacity>
  );
}

export function Comment({
  author, time, counselor, body, onRemove,
}: { author: string; time: string; counselor?: boolean; body: string; onRemove?: () => void }) {
  return (
    <View style={counselor ? s.commentCounselor : undefined}>
      <View style={s.commentHead}>
        <Text style={counselor ? s.kicker : s.commentAuthor}>{author}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12 }}>
          <Text style={s.commentTime}>{time}</Text>
          {onRemove && (
            <TouchableOpacity onPress={onRemove} hitSlop={8}>
              <Text style={s.commentRemove}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={counselor ? s.commentBodyCounselor : s.commentBody}>{body}</Text>
    </View>
  );
}

export function CommentComposer({
  value, onChange, onSubmit, locked, onUnlock, busy,
}: {
  value: string; onChange: (v: string) => void; onSubmit: () => void;
  locked?: boolean; onUnlock?: () => void; busy?: boolean;
}) {
  if (locked) {
    return (
      <TouchableOpacity onPress={onUnlock} activeOpacity={0.85} style={s.locked}>
        <Ionicons name="lock-closed" size={16} color={GOLD} />
        <View style={{ flex: 1 }}>
          <Text style={s.lockedTitle}>Commenting is for subscribers</Text>
          <Text style={s.lockedSub}>Reading the Agora is free. Writing in it is not.</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#888" />
      </TouchableOpacity>
    );
  }
  const can = value.trim().length > 0 && !busy;
  return (
    <View style={{ gap: 10 }}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Say the true thing plainly."
        placeholderTextColor="#555"
        multiline
        style={[s.input, { minHeight: 84, textAlignVertical: 'top' }]}
      />
      <TouchableOpacity onPress={onSubmit} disabled={!can} style={[s.btn, s.btnSm, !can && { opacity: 0.5 }]}>
        <Text style={s.btnText}>{busy ? 'Posting' : 'Post'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const NOTICE: Record<EssayStatus, [string, string]> = {
  draft: ['Draft', 'Only you can see this. Nothing is sent until you submit it.'],
  in_review: ['In review', 'Submitted. An editor reads every essay before it appears in the Agora.'],
  published: ['Published', 'Live in the Agora. Comments are open to subscribers.'],
  returned: ['Returned', 'Sent back with notes. Edit and submit again whenever you are ready.'],
};

export function SubmissionNotice({ state, note, style }: { state: EssayStatus; note?: string | null; style?: StyleProp<ViewStyle> }) {
  const [label, copy] = NOTICE[state];
  return (
    <View style={[s.notice, state === 'published' && { borderColor: '#c9a84c44' }, style]}>
      <Text style={[s.kicker, state === 'draft' && { color: '#c9a84c88' }]}>{label}</Text>
      <Text style={s.noticeText}>{note || copy}</Text>
    </View>
  );
}

export function GoldButton({
  label, onPress, disabled, secondary, style,
}: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.85}
      style={[s.btn, secondary && s.btnSecondary, disabled && { opacity: 0.5 }, style]}>
      <Text style={[s.btnText, secondary && s.btnTextSecondary]}>{label}</Text>
    </TouchableOpacity>
  );
}

export const s = StyleSheet.create({
  kicker: { color: GOLD, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
    backgroundColor: CARD, borderWidth: 1, borderColor: '#c9a84c33',
  },
  chipActive: { backgroundColor: '#c9a84c22', borderColor: GOLD },
  chipText: { color: '#888', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: GOLD },
  row: { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: '#c9a84c22', padding: 16 },
  rowTitle: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 22, marginBottom: 4 },
  rowAuthor: { color: GOLD, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  rowMeta: { color: '#888', fontWeight: '400' },
  rowExcerpt: { color: '#ccc', fontSize: 14, lineHeight: 21, marginBottom: 10 },
  rowFoot: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  tag: { color: '#c9a84c88', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  rowComments: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 'auto' },
  rowCommentsText: { color: '#888', fontSize: 12 },
  answered: { color: GOLD, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 10 },
  commentCounselor: { paddingLeft: 14, borderLeftWidth: 3, borderLeftColor: GOLD },
  commentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 12 },
  commentAuthor: { color: GOLD, fontSize: 13, fontWeight: '600' },
  commentTime: { color: '#555', fontSize: 11 },
  commentRemove: { color: '#888', fontSize: 11 },
  commentBody: { color: '#ccc', fontSize: 14, lineHeight: 22 },
  commentBodyCounselor: { color: '#e8e0d0', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
  locked: {
    flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: CARD,
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#c9a84c44', borderRadius: 12, padding: 16,
  },
  lockedTitle: { color: GOLD, fontSize: 14, fontWeight: '600' },
  lockedSub: { color: '#888', fontSize: 12, lineHeight: 17, marginTop: 2 },
  input: {
    backgroundColor: INK, borderWidth: 1, borderColor: '#c9a84c33', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 15, lineHeight: 22,
  },
  notice: {
    backgroundColor: CARD, borderWidth: 1, borderColor: '#c9a84c22', borderLeftWidth: 3, borderLeftColor: GOLD,
    borderRadius: 12, padding: 16,
  },
  noticeText: { color: '#ccc', fontSize: 14, lineHeight: 21, marginTop: 6 },
  btn: { backgroundColor: GOLD, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnSm: { alignSelf: 'flex-end', paddingHorizontal: 22, paddingVertical: 10 },
  btnSecondary: { backgroundColor: '#c9a84c22', borderWidth: 1, borderColor: '#c9a84c88' },
  btnText: { color: INK, fontSize: 15, fontWeight: '700' },
  btnTextSecondary: { color: GOLD },
});
