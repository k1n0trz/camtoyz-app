import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/preferences/AppPreferences';
import { typography } from '@/theme/index';

interface Props {
  label: string;
  rssi?: number;
}

export function signalBarsForRssi(rssi?: number): number {
  if (rssi === undefined || !Number.isFinite(rssi)) return 0;
  if (rssi >= -55) return 4;
  if (rssi >= -70) return 3;
  if (rssi >= -85) return 2;
  return 1;
}

/** Presenta la calidad BLE sin exponer valores técnicos en dBm. */
export function SignalStrength({ label, rssi }: Props) {
  const theme = useAppTheme();
  const strength = signalBarsForRssi(rssi);

  return (
    <View accessibilityLabel={label} accessibilityRole="image" style={s.root}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.bars}>
        {[5, 8, 11, 14].map((height, index) => (
          <View
            key={height}
            style={{
              width: 3,
              height,
              borderRadius: 2,
              backgroundColor: index < strength ? theme.colors.accent : theme.colors.borderStrong,
            }}
          />
        ))}
      </View>
      <Text style={[s.label, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  bars: { height: 14, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  label: { ...typography.small },
});
