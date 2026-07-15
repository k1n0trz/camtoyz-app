import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import IntensitySlider from '@/components/IntensitySlider';
import { PatternTile } from '@/components/PatternTile';
import { featuredPatterns } from '@/features/patterns/catalog';
import { palette, radii, spacing, typography } from '@/theme/index';

interface Props {
  connected: boolean;
  onPattern: (pattern: number) => Promise<boolean>;
  onIntensity: (value: number) => Promise<boolean>;
  onStop: () => Promise<boolean>;
}

export function RoomVibrationControls({ connected, onPattern, onIntensity, onStop }: Props) {
  const [activePattern, setActivePattern] = useState<number>();
  const [intensity, setIntensity] = useState(45);

  const changeIntensity = useCallback((value: number) => {
    setIntensity(value);
    void onIntensity(value);
  }, [onIntensity]);

  const togglePattern = async (pattern: number) => {
    if (activePattern === pattern) {
      if (await onStop()) setActivePattern(undefined);
    } else if (await onPattern(pattern)) {
      setActivePattern(pattern);
    }
  };

  const stop = () => {
    void onStop().then((sent) => {
      if (sent) setActivePattern(undefined);
    });
  };

  return (
    <View style={s.card}>
      <Text style={s.title}>Vibración remota</Text>
      <View style={s.patterns}>
        {featuredPatterns.map((pattern) => (
          <PatternTile
            key={pattern.id}
            pattern={pattern}
            active={activePattern === pattern.id}
            disabled={!connected}
            onPress={() => void togglePattern(pattern.id)}
          />
        ))}
      </View>
      <View style={s.intensityHead}>
        <Text style={s.intensityLabel}>Intensidad</Text>
        <Text style={s.intensityValue}>{intensity}%</Text>
      </View>
      <IntensitySlider value={intensity} onChange={changeIntensity} />
      <Pressable disabled={!connected} onPress={stop} style={[s.stop, !connected && s.disabled]}>
        <Text style={s.stopText}>Detener vibración</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: radii.cardLg, padding: spacing.xl },
  title: { ...typography.section, color: palette.ink },
  patterns: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.lg },
  intensityHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl },
  intensityLabel: { ...typography.label, color: palette.ink },
  intensityValue: { ...typography.label, color: palette.accent, fontWeight: '800' },
  stop: { height: 44, borderWidth: 1.5, borderColor: palette.accent, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  stopText: { ...typography.label, color: palette.accent, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
