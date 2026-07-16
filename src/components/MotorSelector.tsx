import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n/useTranslation';
import { useAppTheme } from '@/preferences/AppPreferences';
import type { MotorTarget } from '@/ble/protocol';

interface Props {
  channelCount: number;
  target: MotorTarget;
  onChange: (target: MotorTarget) => void;
  compact?: boolean;
  inverted?: boolean;
}

export function MotorSelector({
  channelCount,
  target,
  onChange,
  compact = false,
  inverted = false,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  if (channelCount < 2) return null;

  const targets: MotorTarget[] = ['all', ...Array.from({ length: channelCount }, (_, index) => index)];
  const foreground = inverted ? '#FFFFFF' : theme.colors.ink;
  const border = inverted ? 'rgba(255,255,255,.42)' : theme.colors.borderStrong;

  return (
    <View accessibilityRole="radiogroup" style={[styles.row, compact && styles.compactRow]}>
      {targets.map((option) => {
        const active = option === target;
        const label = option === 'all'
          ? t('motors.all')
          : t('motors.one', { number: option + 1 });
        return (
          <Pressable
            key={String(option)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={label}
            onPress={() => onChange(option)}
            style={[
              styles.chip,
              compact && styles.compactChip,
              { borderColor: border },
              active && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                compact && styles.compactLabel,
                { color: active ? theme.colors.ink : foreground },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  compactRow: { gap: 6, flexWrap: 'nowrap' },
  chip: {
    minHeight: 38,
    minWidth: 76,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactChip: { minHeight: 32, minWidth: 0, flex: 1, paddingHorizontal: 8 },
  label: { fontSize: 13, fontWeight: '700' },
  compactLabel: { fontSize: 11 },
});
