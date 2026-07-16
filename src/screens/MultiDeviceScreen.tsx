import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/routes';
import { useBleStore } from '@/state/bleStore';
import { ProductImage } from '@/components/ProductImage';
import { BackButton } from '@/components/BackButton';
import { goBackOr } from '@/navigation/back';
import { palette, radii, spacing, typography } from '@/theme/index';
import { useAdaptiveStyles } from '@/theme/useAdaptiveStyles';
import { useTranslation } from '@/i18n/useTranslation';

type Props = NativeStackScreenProps<RootStackParamList, 'MultiDevice'>;

export default function MultiDeviceScreen({ navigation }: Props) {
  const s = useAdaptiveStyles(baseStyles);
  const { pick } = useTranslation();
  const connectedDevices = useBleStore((state) => state.connectedDevices);
  const activeDeviceId = useBleStore((state) => state.activeDeviceId);
  const syncEnabled = useBleStore((state) => state.syncEnabled);
  const setActiveDevice = useBleStore((state) => state.setActiveDevice);
  const setSyncEnabled = useBleStore((state) => state.setSyncEnabled);
  const disconnect = useBleStore((state) => state.disconnect);
  const stop = useBleStore((state) => state.stop);
  const canSync = connectedDevices.length > 1;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <BackButton onPress={() => goBackOr(navigation, 'Dashboard')} />
        <Text style={s.title}>{pick('Mis dispositivos', 'My devices')}</Text>
        <View style={{ flex: 1 }} />
        <Text style={s.count}>
          {connectedDevices.length === 1
            ? pick('1 conectado', '1 connected')
            : pick(`${connectedDevices.length} conectados`, `${connectedDevices.length} connected`)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {connectedDevices.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>{pick('Aún no hay un dispositivo activo', 'There is no active device yet')}</Text>
            <Text style={s.emptyText}>{pick('Conecta uno para empezar a administrar tus controles.', 'Connect one to start managing your controls.')}</Text>
          </View>
        ) : (
          connectedDevices.map((device) => {
            const active = device.id === activeDeviceId;
            return (
              <View key={device.id} style={[s.deviceCard, active && s.deviceCardActive]}>
                <View style={s.deviceRow}>
                  <ProductImage name={device.name} size={42} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.deviceName}>{device.name}</Text>
                    <Text style={s.deviceStatus}>{active ? pick('Activo · recibe los controles', 'Active · receiving controls') : pick('Conectado · listo', 'Connected · ready')}</Text>
                  </View>
                  <Text style={s.battery}>{device.battery === undefined ? '—' : `${device.battery}%`}</Text>
                </View>
                <View style={s.deviceActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Usar ${device.name}`}
                    disabled={active}
                    onPress={() => setActiveDevice(device.id)}
                    style={[s.selectButton, active && s.selectButtonActive]}
                  >
                    <Text style={[s.selectLabel, active && s.selectLabelActive]}>{active ? pick('Activo', 'Active') : pick('Usar este', 'Use this')}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Desconectar ${device.name}`}
                    onPress={() => void disconnect(device.id)}
                    style={s.disconnectButton}
                  >
                    <Text style={s.disconnectLabel}>{pick('Desconectar', 'Disconnect')}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pick('Conectar otro dispositivo', 'Connect another device')}
          onPress={() => navigation.navigate('Scan')}
          style={s.addCard}
        >
          <Text style={s.addPlus}>+</Text>
          <Text style={s.addLabel}>{pick('Conectar otro dispositivo', 'Connect another device')}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: syncEnabled, disabled: !canSync }}
          disabled={!canSync}
          onPress={() => setSyncEnabled(!syncEnabled)}
          style={[s.syncCard, !canSync && s.syncDisabled]}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.syncTitle}>{pick('Sincronizar dispositivos', 'Sync devices')}</Text>
            <Text style={s.syncText}>
              {canSync
                ? syncEnabled
                  ? pick('Patrones e intensidad se aplicarán a todos.', 'Patterns and intensity will apply to all devices.')
                  : pick('Solo responde el dispositivo activo.', 'Only the active device responds.')
                : pick('Conecta otro dispositivo para habilitarlo.', 'Connect another device to enable this option.')}
            </Text>
          </View>
          <View style={[s.switchTrack, syncEnabled && s.switchTrackOn]}>
            <View style={[s.switchKnob, syncEnabled && s.switchKnobOn]} />
          </View>
        </Pressable>

        <View style={s.infoCard}>
          <View style={s.infoDot} />
          <Text style={s.infoText}>
            {pick(
              'Detener siempre detiene todos los dispositivos conectados, incluso si la sincronización está apagada.',
              'Stop always stops every connected device, even when synchronization is off.',
            )}
          </Text>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pick('Detener todos los dispositivos', 'Stop all devices')}
          disabled={connectedDevices.length === 0}
          onPress={() => void stop()}
          style={[s.stopButton, connectedDevices.length === 0 && s.disabled]}
        >
          <Text style={s.stopLabel}>{pick('Detener todos', 'Stop all')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={pick('Abrir control', 'Open controls')} onPress={() => goBackOr(navigation, 'Dashboard')} style={s.openButton}>
          <Text style={s.openLabel}>{pick('Abrir control', 'Open controls')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  back: { color: palette.ink, fontSize: 28, lineHeight: 28 },
  title: { ...typography.section, color: palette.ink },
  count: { ...typography.small, color: palette.accent, fontWeight: '700' },
  content: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.lg },
  deviceCard: { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1, borderRadius: radii.cardLg, padding: spacing.lg, gap: spacing.md },
  deviceCardActive: { borderColor: palette.accent, borderWidth: 1.5 },
  emptyCard: { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1, borderRadius: radii.cardLg, padding: spacing.lg, gap: spacing.sm },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  deviceName: { ...typography.label, color: palette.ink, fontWeight: '700' },
  deviceStatus: { ...typography.small, color: palette.accent, marginTop: 2 },
  battery: { ...typography.label, color: palette.ink, fontWeight: '700' },
  deviceActions: { flexDirection: 'row', gap: spacing.sm },
  selectButton: { flex: 1, minHeight: 40, borderRadius: radii.md, borderWidth: 1, borderColor: palette.borderStrong, alignItems: 'center', justifyContent: 'center' },
  selectButtonActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  selectLabel: { ...typography.small, color: palette.ink, fontWeight: '700' },
  selectLabelActive: { color: palette.ink },
  disconnectButton: { minHeight: 40, borderRadius: radii.md, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' },
  disconnectLabel: { ...typography.small, color: palette.accent, fontWeight: '700' },
  emptyTitle: { ...typography.label, color: palette.ink, fontWeight: '700' },
  emptyText: { ...typography.small, color: palette.textSecondary },
  addCard: { minHeight: 66, borderColor: palette.textMuted, borderWidth: 1, borderStyle: 'dashed', borderRadius: radii.cardLg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: spacing.sm },
  addPlus: { color: palette.textSecondary, fontSize: 18 },
  addLabel: { ...typography.label, color: palette.textSecondary },
  syncCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1, borderRadius: radii.card, padding: spacing.lg },
  syncDisabled: { opacity: 0.55 },
  syncTitle: { ...typography.label, color: palette.ink, fontWeight: '700' },
  syncText: { ...typography.small, color: palette.textSecondary, marginTop: 2 },
  switchTrack: { width: 46, height: 27, padding: 3, borderRadius: radii.pill, backgroundColor: palette.borderStrong },
  switchTrackOn: { backgroundColor: palette.accent },
  switchKnob: { width: 21, height: 21, borderRadius: 11, backgroundColor: palette.card },
  switchKnobOn: { transform: [{ translateX: 19 }] },
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
