import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PANEL_WIDTH = Math.min(300, Dimensions.get('window').width * 0.8);

/**
 * Right-slide drawer for the destinations beyond the core tabs: the Academy
 * (web) and the Library (in-app). Both are free to enter — the paid parts
 * (the full curriculum, the corpus writing in the margins, the larger
 * Symposium quota) are gated where they live. Rendered from the Home
 * screen's menu button.
 */
export default function SideMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slide, fade]);

  const close = (after?: () => void) => {
    Animated.parallel([
      Animated.timing(slide, { toValue: PANEL_WIDTH, duration: 180, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      onClose();
      after?.();
    });
  };

  const open = (destination: 'academy' | 'library') => {
    close(() => {
      router.push(destination === 'library' ? '/library' : '/academy' as any);
    });
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => close()}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} />
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, transform: [{ translateX: slide }] },
          ]}
        >
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Explore</Text>
            <TouchableOpacity onPress={() => close()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#8A9BB0" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.item} onPress={() => open('academy')} activeOpacity={0.8}>
            <View style={styles.itemIcon}>
              <Ionicons name="school-outline" size={22} color="#c9a84c" />
            </View>
            <View style={styles.itemBody}>
              <View style={styles.itemTitleRow}>
                <Text style={styles.itemTitle}>The Academy</Text>
              </View>
              <Text style={styles.itemSubtitle}>
                Courses and structured study in the classical tradition.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#555" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} onPress={() => open('library')} activeOpacity={0.8}>
            <View style={styles.itemIcon}>
              <Ionicons name="library-outline" size={22} color="#c9a84c" />
            </View>
            <View style={styles.itemBody}>
              <View style={styles.itemTitleRow}>
                <Text style={styles.itemTitle}>The Library</Text>
              </View>
              <Text style={styles.itemSubtitle}>
                Read the original texts your counselors draw from.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#555" />
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Arete · Be who you want to be.</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: '#16213e',
    borderLeftWidth: 1,
    borderLeftColor: '#c9a84c33',
    paddingHorizontal: 18,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  panelTitle: {
    color: '#c9a84c',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff0d',
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#c9a84c15',
    borderWidth: 1,
    borderColor: '#c9a84c33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    color: '#e0d5b5',
    fontSize: 16,
    fontWeight: '600',
  },
  itemSubtitle: {
    color: '#888',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
  },
  footerText: {
    color: '#555',
    fontSize: 11,
    fontStyle: 'italic',
  },
});
