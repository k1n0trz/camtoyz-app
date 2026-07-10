import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  type DimensionValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/routes';
import { palette, radii, spacing, typography, patternGrid } from '@/theme';
import { useBleStore } from '@/state/bleStore';

/**
 * 03 Dashboard-Connected — patrón de referencia con:
 *  - pill de conexión + batería (CONSERVAR: feature validada)
 *  - grid de patrones escalable (minmax 58, gap 10)
 *  - lista de modos de control -> rutas
 * Datos mock; Codex cablea BleManager + estado real (batería, patrón activo).
 */
type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const PATTERNS = ['P1', 'P2', 'P3', 'P4', 'P5'];
const MODES = [
  { label: 'Control por sonido', sub: 'Reacciona al sonido ambiente' },
  { label: 'Control musical', sub: 'Sincroniza con tu música' },
  { label: 'Interacción remota', sub: 'Salas para compartir el control' },
  { label: 'Control por gesto', sub: 'Dibuja la intensidad en la pantalla' },
];

export default function DashboardScreen({ navigation }: Props) {
  const [active, setActive] = useState(0);
  const device = useBleStore((state) => state.device);
  const connectionState = useBleStore((state) => state.connectionState);
  const connected = connectionState === 'connected';
  const deviceName = device?.name ?? 'Sin dispositivo';
  const battery = device?.battery;
  const batteryWidth: DimensionValue = `${Math.max(0, Math.min(100, battery ?? 0))}%`;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Top bar: pill de conexión */}
      <View style={s.topbar}>
        <Pressable style={s.pill} onPress={() => navigation.navigate('Scan')}>
          <View style={[s.dot, !connected && s.dotInactive]} />
          <Text style={s.pillText}>{deviceName}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <View style={s.langChip}>
          <Text style={s.langText}>ES</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
        {/* Card de dispositivo + batería */}
        <View style={s.deviceCard}>
          <View style={s.deviceIcon} />
          <View style={{ flex: 1 }}>
            <Text style={s.deviceName}>{deviceName}</Text>
            <Text style={s.deviceStatus}>
              {connected ? 'Conectado · BLE' : 'Toca arriba para buscar'}
            </Text>
          </View>
          <View style={s.batteryRow}>
            <View style={s.batteryShell}>
              <View style={[s.batteryFill, { width: batteryWidth }]} />
            </View>
            <Text style={s.batteryPct}>{battery === undefined ? '—' : `${battery}%`}</Text>
          </View>
        </View>

        {/* Grid de patrones escalable */}
        <View>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Vibración</Text>
            <Pressable disabled>
              <Text style={s.link}>Ver todos</Text>
            </Pressable>
          </View>
          <View style={s.grid}>
            {PATTERNS.map((p, i) => (
              <Pressable
                key={p}
                onPress={() => setActive(i)}
                style={[s.cell, i === active && s.cellActive]}
              >
                <Text style={[s.cellLabel, i === active && s.cellLabelActive]}>{p}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Modos de control */}
        <View>
          <Text style={[s.sectionTitle, { marginBottom: spacing.md }]}>Modos de control</Text>
          <View style={{ gap: spacing.md }}>
            {MODES.map((m) => (
              <Pressable key={m.label} style={s.modeRow} disabled>
                <View style={s.modeIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={s.modeLabel}>{m.label}</Text>
                  <Text style={s.modeSub}>{m.sub}</Text>
                </View>
                <Text style={s.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  topbar: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.accent },
  dotInactive: { backgroundColor: palette.textMuted },
  pillText: { fontSize: 13, fontWeight: '600', color: palette.ink },
  langChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.tint2,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langText: { fontSize: 11, fontWeight: '700', color: palette.ink },
  deviceCard: {
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.cardLg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  deviceIcon: { width: 42, height: 42, borderRadius: radii.md, backgroundColor: palette.tint },
  deviceName: { fontSize: 15, fontWeight: '700', color: palette.ink },
  deviceStatus: { fontSize: 12, fontWeight: '600', color: palette.accent, marginTop: 2 },
  batteryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  batteryShell: {
    width: 30,
    height: 14,
    borderWidth: 1.5,
    borderColor: palette.textMuted,
    borderRadius: 4,
    padding: 2,
  },
  batteryFill: { height: '100%', backgroundColor: palette.ink, borderRadius: 1 },
  batteryPct: { fontSize: 13, fontWeight: '700', color: palette.ink },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.md },
  sectionTitle: { ...typography.section, color: palette.ink },
  link: { fontSize: 12, fontWeight: '600', color: palette.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: patternGrid.gap },
  cell: {
    width: patternGrid.minCell,
    height: patternGrid.minCell,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: { borderWidth: 1.5, borderColor: palette.accent },
  cellLabel: { fontSize: 9, fontWeight: '700', color: palette.textMuted },
  cellLabelActive: { color: palette.accent },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.card,
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
  },
  modeIcon: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: palette.borderStrong },
  modeLabel: { fontSize: 14, fontWeight: '700', color: palette.ink },
  modeSub: { fontSize: 12, color: palette.textSecondary, marginTop: 1 },
  chevron: { color: palette.textMuted, fontSize: 18 },
});
