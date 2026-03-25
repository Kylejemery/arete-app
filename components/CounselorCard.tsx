import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Counselor } from '@/lib/types';

interface CounselorCardProps {
  counselor: Counselor;
  isSelected: boolean;
  isDisabled: boolean;
  isFutureSelf?: boolean;
  onToggle: (slug: string) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  stoics: { bg: 'rgba(201,168,76,0.2)', text: '#c9a84c' },
  warriors: { bg: 'rgba(239,68,68,0.2)', text: '#fca5a5' },
  athletes: { bg: 'rgba(59,130,246,0.2)', text: '#93c5fd' },
  builders: { bg: 'rgba(34,197,94,0.2)', text: '#86efac' },
  writers: { bg: 'rgba(168,85,247,0.2)', text: '#d8b4fe' },
  spiritual: { bg: 'rgba(99,102,241,0.2)', text: '#a5b4fc' },
};

const CHALLENGE_COLORS: Record<string, { bg: string; text: string }> = {
  direct: { bg: 'rgba(239,68,68,0.15)', text: '#f87171' },
  firm: { bg: 'rgba(234,179,8,0.15)', text: '#fde047' },
  gentle: { bg: 'rgba(34,197,94,0.15)', text: '#86efac' },
};

export default function CounselorCard({
  counselor,
  isSelected,
  isDisabled,
  isFutureSelf = false,
  onToggle,
}: CounselorCardProps) {
  const categoryColor = CATEGORY_COLORS[counselor.category] ?? { bg: 'rgba(201,168,76,0.2)', text: '#c9a84c' };
  const challengeColor = counselor.challenge_level ? CHALLENGE_COLORS[counselor.challenge_level] : null;

  const cardStyle = [
    styles.card,
    isSelected && styles.cardSelected,
    isFutureSelf && styles.cardFutureSelf,
    isDisabled && !isSelected && styles.cardDisabled,
  ];

  const handlePress = () => {
    if (!isFutureSelf && !isDisabled) {
      onToggle(counselor.slug);
    }
  };

  return (
    <TouchableOpacity
      style={cardStyle}
      onPress={handlePress}
      activeOpacity={isFutureSelf || isDisabled ? 1 : 0.75}
    >
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: categoryColor.bg }]}>
          <Text style={[styles.badgeText, { color: categoryColor.text }]}>
            {counselor.category}
          </Text>
        </View>
        {challengeColor && counselor.challenge_level && (
          <View style={[styles.badge, { backgroundColor: challengeColor.bg }]}>
            <Text style={[styles.badgeText, { color: challengeColor.text }]}>
              {counselor.challenge_level}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.name}>{counselor.name}</Text>
      <Text style={styles.oneLine} numberOfLines={2}>
        {counselor.one_line}
      </Text>

      {isFutureSelf && (
        <Text style={styles.alwaysPresent}>Always Present</Text>
      )}

      {isSelected && !isFutureSelf && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a3a5c',
    marginBottom: 10,
  },
  cardSelected: {
    borderColor: '#c9a84c',
    borderWidth: 2,
  },
  cardFutureSelf: {
    borderColor: '#c9a84c',
    borderWidth: 2,
  },
  cardDisabled: {
    opacity: 0.4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  name: {
    color: '#e0e0e0',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  oneLine: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
  },
  alwaysPresent: {
    color: '#c9a84c',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  checkmark: {
    position: 'absolute',
    bottom: 10,
    right: 14,
    color: '#c9a84c',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
