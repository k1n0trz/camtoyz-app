import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PatternTile } from '@/components/PatternTile';
import { patternCategories, isPatternSupported } from '@/features/patterns/catalog';
import type { RootStackParamList } from '@/navigation/routes';
import { useBleStore } from '@/state/bleStore';
import { palette, radii, spacing, typography, patternGrid } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PatternsAll'>;

export default function PatternsAllScreen({ navigation }: Props) {
  const device = useBleStore((state) => state.device);
  const connectionState = useBleStore((state) => state.connectionState);
  const activePattern = useBleStore((state) => state.activePattern);
  const commandBusy = useBleStore((state) => state.commandBusy);
  const commandError = useBleStore((state) => state.error);
  const setPattern = useBleStore((state) => state.setPattern);
  const stop = useBleStore((state) => state.stop);
  const connected = connectionState === 'connected';
  const patternCount = device?.patternCount;

  useEffect(
    () =>
      navigation.addListener('blur', () => {
        void stop();
      }),
    [navigation, stop],
  );

  const handlePattern = async (pattern: number) => {
    if (activePattern === pattern) {
      await stop();
    } else {
      await setPattern(pattern);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver al control"
          onPress={() => navigation.goBack()}
          style={s.backButton}
        >
          <Text style={s.backLabel}>‹</Text>
        </Pressable>
        <Text style={s.title}>Todos los patrones</Text>
        <View style={{ flex: 1 }} />
        <View style={s.activePill}>
          <View style={s.activeDot} />
          <Text style={s.activeLabel}>{activePattern ? `P${activePattern}` : 'Stop'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {patternCategories.map((category) => (
          <View key={category.id}>
            <Text style={s.category}>{category.label}</Text>
            <View style={s.grid}>
              {category.patterns.map((pattern) => (
                <PatternTile
                  key={pattern.id}
                  pattern={pattern}
                  active={activePattern === pattern.id}
                  disabled={
                    !connected ||
                    commandBusy ||
                    !isPatternSupported(pattern, patternCount)
                  }
                  onPress={() => void handlePattern(pattern.id)}
                />
              ))}
            </View>
          </View>
        ))}

        <View style={s.infoCard}>
          <View style={s.infoDot} />
          <Text style={s.infoText}>
            El catálogo crece por datos. Este dispositivo habilita únicamente los patrones que anuncia por Bluetooth.
          </Text>
        </View>
        {commandError ? <Text style={s.error}>{commandError}</Text> : null}
      </ScrollView>

      <View style={s.footer}>
        <Text style={s.stopState}>{activePattern ? `Patrón P${activePattern} activo` : 'Motor detenido'}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Detener vibración"
          disabled={!connected || commandBusy}
          onPress={() => void stop()}
          style={[s.stopButton, (!connected || commandBusy) && s.stopDisabled]}
        >
          <Text style={s.stopLabel}>Detener</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  backButton: { width: 28, alignItems: 'flex-start' },
  backLabel: { color: palette.ink, fontSize: 28, lineHeight: 28 },
  title: { ...typography.section, color: palette.ink },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.accent },
  activeLabel: { ...typography.small, color: palette.ink, fontWeight: '600' },
  content: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.xxl },
  category: {
    ...typography.mono,
    color: palette.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.md - 2,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: patternGrid.gap },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.md - 2,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    padding: spacing.lg - 2,
    alignItems: 'flex-start',
  },
  infoDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, backgroundColor: palette.textMuted },
  infoText: { ...typography.small, color: palette.textSecondary, flex: 1, lineHeight: 18 },
  error: { ...typography.small, color: palette.danger },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.bg,
  },
  stopState: { ...typography.small, color: palette.textSecondary },
  stopButton: {
    minHeight: 42,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: palette.accent,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopDisabled: { opacity: 0.4 },
  stopLabel: { ...typography.small, color: palette.accent, fontWeight: '700' },
});
