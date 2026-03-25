import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Counselor } from '@/lib/types';

interface CabinetPreviewProps {
  selectedCounselors: Counselor[];
  onSave: () => void;
  isSaving: boolean;
  canSave: boolean;
}

export default function CabinetPreview({
  selectedCounselors,
  onSave,
  isSaving,
  canSave,
}: CabinetPreviewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Cabinet</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
      >
        {/* Future Self always first */}
        <View style={[styles.pill, styles.pillFutureSelf]}>
          <Text style={styles.pillTextGold}>Future Self</Text>
        </View>
        {selectedCounselors.map((c) => (
          <View key={c.slug} style={styles.pill}>
            <Text style={styles.pillText}>{c.name}</Text>
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        onPress={onSave}
        disabled={!canSave || isSaving}
        activeOpacity={0.8}
      >
        <Text style={styles.saveButtonText}>
          {isSaving ? 'Saving…' : 'Save Cabinet'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#16213e',
    borderTopWidth: 1,
    borderTopColor: '#c9a84c22',
    padding: 12,
  },
  title: {
    color: '#c9a84c',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#c9a84c33',
    backgroundColor: '#1a1a2e',
  },
  pillFutureSelf: {
    borderColor: '#c9a84c',
    backgroundColor: 'rgba(201,168,76,0.1)',
  },
  pillText: {
    color: '#e0e0e0',
    fontSize: 13,
    fontWeight: '500',
  },
  pillTextGold: {
    color: '#c9a84c',
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#c9a84c',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#1a1a2e',
    fontSize: 15,
    fontWeight: '700',
  },
});
