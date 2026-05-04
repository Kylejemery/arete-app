import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { PurchasesPackage } from 'react-native-purchases';
let Purchases: any;
let PURCHASES_ERROR_CODE: any;
try {
  const mod = require('react-native-purchases');
  Purchases = mod.default;
  PURCHASES_ERROR_CODE = mod.PURCHASES_ERROR_CODE;
} catch {
  const mock = require('@/lib/purchases-mock');
  Purchases = mock.default;
  PURCHASES_ERROR_CODE = mock.PURCHASES_ERROR_CODE;
}

// ─── Static fallback display data ────────────────────────────────────────────

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
    identifier: '$rc_monthly',
    label: 'Arete',
    price: '$9.99',
    period: '/mo',
    badge: null,
    highlighted: false,
    description: '50 messages/day · All 23 counselors',
  },
  {
    identifier: '$rc_annual',
    label: 'Arete Annual',
    price: '$79.99',
    period: '/yr',
    badge: 'BEST VALUE',
    highlighted: true,
    description: '$6.67/mo · Save 33% · All 23 counselors',
  },
  {
    identifier: 'arete_pro',
    label: 'Arete Pro',
    price: '$19.99',
    period: '/mo',
    badge: 'UNLIMITED',
    highlighted: false,
    description: 'Unlimited messages · All 23 counselors',
  },
];

const FEATURES = [
  { label: 'Messages/day',   free: '10',        arete: '50',      pro: 'Unlimited' },
  { label: 'Counselors',     free: '3',         arete: '23',      pro: '23' },
  { label: 'Token budget',   free: 'Standard',  arete: 'Extended', pro: 'Max' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [packages, setPackages] = useState<Record<string, PurchasesPackage>>({});
  const [selectedId, setSelectedId] = useState<string>('$rc_annual');
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);

  // ── Fetch offerings ───────────────────────────────────────────────────────

  useEffect(() => {
    if (Platform.OS !== 'ios') { setLoadingOfferings(false); return; }
    (async () => {
      try {
        const offerings = await Purchases.getOfferings();
        const current = offerings.current;
        if (!current) return;

        const pkgMap: Record<string, PurchasesPackage> = {};
        for (const pkg of current.availablePackages) {
          pkgMap[pkg.identifier] = pkg;
        }
        setPackages(pkgMap);
      } catch (e) {
        console.warn('Failed to load offerings:', e);
      } finally {
        setLoadingOfferings(false);
      }
    })();
  }, []);

  // ── Purchase ──────────────────────────────────────────────────────────────

  const handleSubscribe = async () => {
    if (Platform.OS !== 'ios') return;
    const pkg = packages[selectedId];
    if (!pkg) { setError('Plan not available. Please try again.'); return; }

    setError(null);
    setPurchasing(true);
    try {
      await Purchases.purchasePackage(pkg);
      router.back();
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      if (code !== PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        setError('Purchase failed. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  // ── Restore ───────────────────────────────────────────────────────────────

  const handleRestore = async () => {
    if (Platform.OS !== 'ios') return;
    setError(null);
    setRestoring(true);
    try {
      await Purchases.restorePurchases();
      router.back();
    } catch {
      setError('Restore failed. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

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

        {/* Plan cards */}
        {loadingOfferings ? (
          <ActivityIndicator color="#C9A84C" style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.plansContainer}>
            {PLAN_DISPLAY.map(plan => {
              const selected = plan.identifier === selectedId;
              return (
                <TouchableOpacity
                  key={plan.identifier}
                  style={[
                    styles.planCard,
                    plan.highlighted && styles.planCardHighlighted,
                    selected && styles.planCardSelected,
                  ]}
                  onPress={() => setSelectedId(plan.identifier)}
                  activeOpacity={0.8}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{plan.badge}</Text>
                    </View>
                  )}

                  <View style={styles.planRow}>
                    {/* Selection indicator */}
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected && <View style={styles.radioDot} />}
                    </View>

                    <View style={styles.planInfo}>
                      <Text style={styles.planLabel}>{plan.label}</Text>
                      <Text style={styles.planDescription}>{plan.description}</Text>
                    </View>

                    <View style={styles.planPriceBlock}>
                      <Text style={[styles.planPrice, selected && styles.planPriceSelected]}>
                        {plan.price}
                      </Text>
                      <Text style={styles.planPeriod}>{plan.period}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Subscribe button */}
        <TouchableOpacity
          style={[styles.subscribeButton, purchasing && styles.subscribeButtonDisabled]}
          onPress={handleSubscribe}
          disabled={purchasing || loadingOfferings}
          activeOpacity={0.85}
        >
          {purchasing ? (
            <ActivityIndicator color="#0A1628" />
          ) : (
            <Text style={styles.subscribeButtonText}>Subscribe</Text>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreButton}>
          <Text style={styles.restoreText}>
            {restoring ? 'Restoring…' : 'Restore Purchases'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Subscriptions auto-renew. Cancel anytime in your App Store settings.
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
  planCardSelected: {
    borderColor: GOLD,
    backgroundColor: '#12213D',
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
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioSelected: {
    borderColor: GOLD,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: GOLD,
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
  planPriceSelected: {
    color: GOLD,
  },
  planPeriod: {
    color: MUTED,
    fontSize: 11,
  },

  // Error
  errorBox: {
    backgroundColor: 'rgba(200,50,50,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(200,50,50,0.4)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#E07070',
    fontSize: 13,
    textAlign: 'center',
  },

  // Subscribe button
  subscribeButton: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    color: NAVY,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Restore
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  restoreText: {
    color: MUTED,
    fontSize: 13,
  },

  // Legal
  legal: {
    color: '#4A5A70',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
