import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

/**
 * Renders a counselor line as a branded quote card and hands it to the system
 * share sheet as an image. Every share is the app introducing itself in
 * someone else's feed. Long quotes are trimmed at a sentence boundary so the
 * card stays a card.
 */
export default function ShareQuoteModal({
  visible,
  onClose,
  quote,
  counselorName,
}: {
  visible: boolean;
  onClose: () => void;
  quote: string;
  counselorName: string;
}) {
  // ViewShot's own ref type; captureRef accepts it directly.
  const cardRef = useRef<any>(null);
  const [sharing, setSharing] = useState(false);

  // Trim to something card-sized, ending at a sentence when possible.
  const display = (() => {
    const clean = quote.trim().replace(/\s+/g, ' ');
    if (clean.length <= 320) return clean;
    const cut = clean.slice(0, 320);
    const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    return lastStop > 120 ? cut.slice(0, lastStop + 1) : cut.trimEnd() + '…';
  })();

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share this counsel' });
      }
    } catch (e) {
      console.warn('[share-quote] failed:', (e as Error)?.message);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* The card that gets captured */}
          <ViewShot ref={cardRef} style={styles.card}>
            <Text style={styles.cardGlyph}>❝</Text>
            <Text style={styles.cardQuote}>{display}</Text>
            <View style={styles.cardRule} />
            <Text style={styles.cardCounselor}>{counselorName}</Text>
            <Text style={styles.cardVia}>via the Cabinet</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardBrand}>A R E T E</Text>
              <Text style={styles.cardTagline}>Be who you want to be.</Text>
            </View>
          </ViewShot>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={sharing}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton} onPress={share} disabled={sharing}>
              {sharing ? (
                <ActivityIndicator size="small" color="#1a1a2e" />
              ) : (
                <>
                  <Ionicons name="share-outline" size={16} color="#1a1a2e" />
                  <Text style={styles.shareText}>Share</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
  },
  card: {
    backgroundColor: '#101a30',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#c9a84c55',
    paddingVertical: 34,
    paddingHorizontal: 28,
  },
  cardGlyph: {
    color: '#c9a84c',
    fontSize: 40,
    lineHeight: 40,
    fontFamily: SERIF,
    marginBottom: 4,
  },
  cardQuote: {
    color: '#e8e2cf',
    fontSize: 19,
    lineHeight: 30,
    fontFamily: SERIF,
  },
  cardRule: {
    width: 48,
    height: 2,
    backgroundColor: '#c9a84c',
    marginTop: 22,
    marginBottom: 12,
  },
  cardCounselor: {
    color: '#c9a84c',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardVia: {
    color: '#667',
    fontSize: 11,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 28,
  },
  cardBrand: {
    color: '#c9a84c',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
  },
  cardTagline: {
    color: '#556',
    fontSize: 11,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffffff22',
  },
  cancelText: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 22,
    minWidth: 96,
    justifyContent: 'center',
  },
  shareText: { color: '#1a1a2e', fontSize: 14, fontWeight: '700' },
});
