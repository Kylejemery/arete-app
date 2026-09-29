import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import CounselorText from './CounselorText';
import type { LiveVoice } from '@/lib/cabinetStream';

// The Cabinet's reply while it is being written (retention plan R13), the
// mobile twin of web/src/components/LiveVoiceBubbles.tsx. One bubble per
// voice in the screen's own bubble styles, with a small gold bar on the
// voice still speaking. When the turn completes the screen swaps these for
// the saved messages.

interface Props {
  voices: LiveVoice[];
  fallbackName: string;
  rowStyle: StyleProp<ViewStyle>;
  bubbleStyle: StyleProp<ViewStyle>;
  labelStyle: StyleProp<TextStyle>;
  textStyle: StyleProp<TextStyle>;
}

export default function LiveVoiceBubbles({ voices, fallbackName, rowStyle, bubbleStyle, labelStyle, textStyle }: Props) {
  const shown = voices.filter(v => v.text.trim().length > 0);
  if (shown.length === 0) return null;
  return (
    <>
      {shown.map((v, i) => (
        <View key={`${v.counselorId ?? 'voice'}-${i}`} style={rowStyle}>
          <View style={bubbleStyle} accessibilityLiveRegion="polite">
            <Text style={labelStyle}>{v.counselorName || fallbackName}</Text>
            <CounselorText text={v.text} style={textStyle} />
            {!v.done && <View style={styles.cursor} />}
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  cursor: {
    width: 6,
    height: 14,
    marginTop: 4,
    borderRadius: 1,
    backgroundColor: 'rgba(201,168,76,0.6)',
  },
});
