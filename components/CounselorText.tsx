import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

// Renders a counselor's reply on mobile (retention plan R4). The models answer
// in light markdown: **bold**, *italics*, --- rules, lists, > quotes. Before
// this the bubble printed the asterisks. Mirror of the web CounselorMarkdown
// component, built from nested Text so it needs no markdown dependency and
// inherits the caller's text style.

type Block =
  | { type: 'p'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'hr' }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'h'; text: string };

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    if (lines.length === 1 && /^([-*_])\1{2,}$/.test(lines[0])) { blocks.push({ type: 'hr' }); continue; }
    if (lines.every(l => /^[-*•]\s+/.test(l))) { blocks.push({ type: 'ul', items: lines.map(l => l.replace(/^[-*•]\s+/, '')) }); continue; }
    if (lines.every(l => /^\d+[.)]\s+/.test(l))) { blocks.push({ type: 'ol', items: lines.map(l => l.replace(/^\d+[.)]\s+/, '')) }); continue; }
    if (lines.every(l => /^>\s?/.test(l))) { blocks.push({ type: 'quote', text: lines.map(l => l.replace(/^>\s?/, '')).join(' ') }); continue; }
    if (lines.length === 1 && /^#{1,6}\s+/.test(lines[0])) { blocks.push({ type: 'h', text: lines[0].replace(/^#{1,6}\s+/, '') }); continue; }
    // Single line breaks inside a paragraph are kept, as the plain Text did.
    blocks.push({ type: 'p', text: lines.join('\n') });
  }
  return blocks;
}

const INLINE = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*\n]+\*|_[^_\n]+_|`[^`]+`)/g;

export function renderInline(text: string): React.ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (!part) return null;
    if (part.startsWith('***') && part.endsWith('***') && part.length > 6) return <Text key={i} style={styles.boldItalic}>{part.slice(3, -3)}</Text>;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <Text key={i} style={styles.bold}>{part.slice(2, -2)}</Text>;
    if (((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) && part.length > 2) {
      return <Text key={i} style={styles.italic}>{part.slice(1, -1)}</Text>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <Text key={i} style={styles.code}>{part.slice(1, -1)}</Text>;
    return <Text key={i}>{part}</Text>;
  });
}

export default function CounselorText({ text, style, selectable = true }: { text: string; style?: StyleProp<TextStyle>; selectable?: boolean }) {
  const blocks = parseBlocks(text);
  return (
    <View style={styles.stack}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'hr':
            return <View key={i} style={styles.rule} />;
          case 'quote':
            return (
              <View key={i} style={styles.quote}>
                <Text style={[style, styles.quoteText]} selectable={selectable}>{'“'}{renderInline(block.text)}{'”'}</Text>
              </View>
            );
          case 'ul':
          case 'ol':
            return (
              <View key={i} style={styles.list}>
                {block.items.map((item, j) => (
                  <View key={j} style={styles.listRow}>
                    <Text style={[style, styles.bullet]}>{block.type === 'ul' ? '•' : `${j + 1}.`}</Text>
                    <Text style={[style, styles.listItem]} selectable={selectable}>{renderInline(item)}</Text>
                  </View>
                ))}
              </View>
            );
          case 'h':
            return <Text key={i} style={[style, styles.bold]} selectable={selectable}>{renderInline(block.text)}</Text>;
          default:
            return <Text key={i} style={style} selectable={selectable}>{renderInline(block.text)}</Text>;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  boldItalic: { fontWeight: '700', fontStyle: 'italic' },
  code: { fontFamily: 'monospace', fontSize: 13 },
  rule: { height: 1, backgroundColor: 'rgba(201,168,76,0.3)', marginVertical: 2 },
  quote: { borderLeftWidth: 3, borderLeftColor: 'rgba(201,168,76,0.5)', paddingLeft: 10, paddingVertical: 2 },
  quoteText: { fontStyle: 'italic', color: '#c9a84c' },
  list: { gap: 4 },
  listRow: { flexDirection: 'row', gap: 8 },
  bullet: { width: 18, textAlign: 'right' },
  listItem: { flex: 1 },
});
