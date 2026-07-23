import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PatternDefinition } from '@/features/patterns/catalog';
import { useAppTheme } from '@/preferences/AppPreferences';
import { useTranslation } from '@/i18n/useTranslation';
import { patternGrid, radii, spacing } from '@/theme/index';

interface Props {
  pattern: PatternDefinition;
  active?: boolean;
  disabled?: boolean;
  compact?: boolean;
  inverted?: boolean;
  onPress: () => void;
}

export function PatternTile({
  pattern,
  active = false,
  disabled = false,
  compact = false,
  inverted = false,
  onPress,
}: Props) {
  const theme = useAppTheme();
  const { pick } = useTranslation();
  const barColor = active ? theme.colors.accent : inverted ? '#FFFFFF' : theme.colors.textSecondary;
  const foreground = inverted ? '#FFFFFF' : theme.colors.textMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={active
        ? pick(`Detener ${pattern.label}`, `Stop ${pattern.label}`)
        : pick(`Activar ${pattern.label}`, `Enable ${pattern.label}`)}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.cell,
        compact && styles.compactCell,
        {
          borderColor: active ? theme.colors.accent : inverted ? 'rgba(255,255,255,.38)' : theme.colors.borderStrong,
          backgroundColor: active
            ? theme.colors.primary
            : inverted
              ? 'rgba(28,15,42,.62)'
              : theme.colors.card,
        },
        active && styles.cellActive,
        disabled && styles.cellDisabled,
      ]}
    >
      <View style={styles.waveform}>
        {pattern.waveform.map((height, index) => (
          <View key={index} style={[styles.bar, { height, backgroundColor: barColor }]} />
        ))}
      </View>
      <Text style={[styles.label, { color: active ? theme.colors.ink : foreground }]}>{pattern.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: patternGrid.minCell,
    height: patternGrid.minCell,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm - 1,
  },
  compactCell: { width: 48, height: 48, borderRadius: radii.md },
  cellActive: { borderWidth: 1.5 },
  cellDisabled: { opacity: 0.35 },
  waveform: { height: 18, flexDirection: 'row', alignItems: 'flex-end', gap: 2.5 },
  bar: { width: 3, borderRadius: radii.sm },
  label: { fontSize: 9, fontWeight: '700' },
});
