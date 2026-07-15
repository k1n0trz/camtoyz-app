import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PatternDefinition } from '@/features/patterns/catalog';
import { palette, patternGrid, radii, spacing } from '@/theme/index';

interface Props {
  pattern: PatternDefinition;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function PatternTile({ pattern, active = false, disabled = false, onPress }: Props) {
  const barColor = active ? palette.accent : palette.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={active ? `Detener ${pattern.label}` : `Activar ${pattern.label}`}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.cell, active && styles.cellActive, disabled && styles.cellDisabled]}
    >
      <View style={styles.waveform}>
        {pattern.waveform.map((height, index) => (
          <View key={index} style={[styles.bar, { height, backgroundColor: barColor }]} />
        ))}
      </View>
      <Text style={[styles.label, active && styles.labelActive]}>{pattern.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: patternGrid.minCell,
    height: patternGrid.minCell,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm - 1,
  },
  cellActive: { borderWidth: 1.5, borderColor: palette.accent },
  cellDisabled: { opacity: 0.35 },
  waveform: { height: 18, flexDirection: 'row', alignItems: 'flex-end', gap: 2.5 },
  bar: { width: 3, borderRadius: radii.sm },
  label: { fontSize: 9, fontWeight: '700', color: palette.textMuted },
  labelActive: { color: palette.accent },
});
