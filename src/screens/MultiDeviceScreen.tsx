import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/routes';
import { useBleStore } from '@/state/bleStore';
import { palette, radii, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MultiDevice'>;

/**
 * Modelo de Fase 3: muestra el dispositivo activo y deja preparada la entrada
 * para añadir otro. El transporte BLE sigue siendo de una conexión hasta que
 * la capa de multi-conexión sea implementada y validada con dos periféricos.
 */
export default function MultiDeviceScreen({ navigation }: Props) {
  const device = useBleStore((state) => state.device);
  const connectionState = useBleStore((state) => state.connectionState);
  const activePattern = useBleStore((state) => state.activePattern);
  const commandBusy = useBleStore((state) => state.commandBusy);
  const stop = useBleStore((state) => state.stop);
  const connected = connectionState === 'connected';

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => navigation.goBack()}>
          <Text style={s.back}>‹</Text>
        </Pressable>
        <Text style={s.title}>Mis dispositivos</Text>
        <View style={{ flex: 1 }} />
        <Text style={s.count}>{connected ? '1 conectado' : 'Sin conexión'}</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {connected && device ? (
          <View style={s.activeCard}>
            <View style={s.deviceRow}>
              <View style={s.deviceIcon} />
              <View style={{ flex: 1 }}>
                <Text style={s.deviceName}>{device.name}</Text>
                <Text style={s.deviceStatus}>Activo · controlando ahora</Text>
              </View>
              <Text style={s.battery}>{device.battery === undefined ? '—' : `${device.battery}%`}</Text>
            </View>
            <Text style={s.patternStatus}>{activePattern ? `P${activePattern} activo` : 'Motor detenido'}</Text>
          </View>
        ) : (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>Aún no hay un dispositivo activo</Text>
            <Text style={s.emptyText}>Conecta uno para empezar a administrar tus controles.</Text>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Conectar otro dispositivo"
          onPress={() => navigation.navigate('Scan')}
          style={s.addCard}
        >
          <Text style={s.addPlus}>+</Text>
          <Text style={s.addLabel}>Conectar otro dispositivo</Text>
        </Pressable>

        <View style={s.syncCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.syncTitle}>Sincronizar dispositivos</Text>
            <Text style={s.syncText}>Disponible cuando haya dos dispositivos conectados.</Text>
          </View>
          <View style={s.switchOff}><View style={s.switchKnob} /></View>
        </View>

        <View style={s.infoCard}>
          <View style={s.infoDot} />
          <Text style={s.infoText}>
            La interfaz está lista para múltiples dispositivos. La conexión simultánea se habilitará tras validarla con dos equipos físicos.
          </Text>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Detener todos los dispositivos"
          disabled={!connected || commandBusy}
          onPress={() => void stop()}
          style={[s.stopButton, (!connected || commandBusy) && s.disabled]}
        >
          <Text style={s.stopLabel}>Detener todos</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir control" onPress={() => navigation.goBack()} style={s.openButton}>
          <Text style={s.openLabel}>Abrir control</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  back: { color: palette.ink, fontSize: 28, lineHeight: 28 },
  title: { ...typography.section, color: palette.ink },
  count: { ...typography.small, color: palette.accent, fontWeight: '700' },
  content: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.lg },
  activeCard: { backgroundColor: palette.card, borderColor: palette.accent, borderWidth: 1.5, borderRadius: radii.cardLg, padding: spacing.lg, gap: spacing.md },
  emptyCard: { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1, borderRadius: radii.cardLg, padding: spacing.lg, gap: spacing.sm },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  deviceIcon: { width: 42, height: 42, borderRadius: radii.md, backgroundColor: palette.tint },
  deviceName: { ...typography.label, color: palette.ink, fontWeight: '700' },
  deviceStatus: { ...typography.small, color: palette.accent, marginTop: 2 },
  battery: { ...typography.label, color: palette.ink, fontWeight: '700' },
  patternStatus: { ...typography.mono, color: palette.textSecondary },
  emptyTitle: { ...typography.label, color: palette.ink, fontWeight: '700' },
  emptyText: { ...typography.small, color: palette.textSecondary },
  addCard: { minHeight: 66, borderColor: palette.textMuted, borderWidth: 1, borderStyle: 'dashed', borderRadius: radii.cardLg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm },
  addPlus: { color: palette.textSecondary, fontSize: 18 },
  addLabel: { ...typography.label, color: palette.textSecondary },
  syncCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1, borderRadius: radii.card, padding: spacing.lg },
  syncTitle: { ...typography.label, color: palette.ink, fontWeight: '700' },
  syncText: { ...typography.small, color: palette.textSecondary, marginTop: 2 },
  switchOff: { width: 44, height: 26, padding: 3, borderRadius: radii.pill, backgroundColor: palette.borderStrong },
  switchKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: palette.card },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg },
  infoDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, backgroundColor: palette.accent },
  infoText: { ...typography.small, color: palette.textSecondary, flex: 1, lineHeight: 18 },
  footer: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: palette.border },
  stopButton: { flex: 1, minHeight: 52, borderRadius: radii.lg, borderWidth: 1.5, borderColor: palette.accent, alignItems: 'center', justifyContent: 'center' },
  stopLabel: { ...typography.label, color: palette.accent, fontWeight: '700' },
  openButton: { flex: 1, minHeight: 52, borderRadius: radii.lg, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  openLabel: { ...typography.label, color: palette.ink, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
