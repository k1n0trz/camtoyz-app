import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/routes';
import { palette, radii, spacing, typography } from '@/theme';
import { useBleStore } from '@/state/bleStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

export default function ScanScreen({ navigation }: Props) {
  const devices = useBleStore((state) => state.devices);
  const connectionState = useBleStore((state) => state.connectionState);
  const connectedDevice = useBleStore((state) => state.device);
  const error = useBleStore((state) => state.error);
  const scan = useBleStore((state) => state.scan);
  const stopScan = useBleStore((state) => state.stopScan);
  const connect = useBleStore((state) => state.connect);
  const disconnect = useBleStore((state) => state.disconnect);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void scan();
    return () => {
      void stopScan();
    };
  }, [scan, stopScan]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const close = () => {
    void stopScan();
    navigation.goBack();
  };

  const handleConnect = async (deviceId: string) => {
    const connected = await connect(deviceId);
    if (connected) navigation.replace('Dashboard');
  };

  const searching = connectionState === 'scanning';
  const connecting = connectionState === 'connecting';
  const showError = connectionState === 'error' && devices.length === 0;

  return (
    <SafeAreaView style={s.root} edges={[]}>
      <View style={s.scrim} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <View style={s.header}>
          <Text style={s.title}>Buscar dispositivos</Text>
          <Pressable accessibilityRole="button" onPress={close} hitSlop={12}>
            <Text style={s.cancel}>Cancelar</Text>
          </Pressable>
        </View>

        {showError ? (
          <View style={s.errorBody}>
            <View style={s.errorIcon}>
              <Text style={s.errorBang}>!</Text>
            </View>
            <View>
              <Text style={s.errorTitle}>No se encontró el dispositivo</Text>
              <Text style={s.errorText}>
                {error ??
                  'Comprueba que esté encendido y con carga. Mantén pulsado su botón 3 segundos hasta que parpadee.'}
              </Text>
            </View>
            <View style={s.errorActions}>
              <Pressable style={s.primaryButton} onPress={() => void scan()}>
                <Text style={s.primaryLabel}>Reintentar búsqueda</Text>
              </Pressable>
              <Pressable style={s.secondaryButton} onPress={close}>
                <Text style={s.secondaryLabel}>Volver</Text>
              </Pressable>
            </View>
          </View>
        ) : devices.length === 0 ? (
          <View style={s.emptyBody}>
            <View style={s.radar}>
              <Animated.View
                style={[
                  s.ring,
                  {
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
                    transform: [
                      { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
                    ],
                  },
                ]}
              />
              <View style={s.ringInner} />
              <View style={s.radarCore}>
                <View style={s.radarDot} />
              </View>
            </View>
            <View style={s.centerText}>
              <Text style={s.searchingTitle}>Buscando dispositivos…</Text>
              <Text style={s.searchingText}>
                Ningún dispositivo aún.{`\n`}Asegúrate de que esté encendido y cerca.
              </Text>
            </View>
            <View style={s.scanNote}>
              <View style={s.noteDot} />
              <Text style={s.noteText}>
                Bluetooth activo · el escaneo se detiene automáticamente a los 30 s
              </Text>
            </View>
          </View>
        ) : (
          <View style={s.foundBody}>
            <View style={s.foundStatus}>
              {searching && <ActivityIndicator color={palette.accent} />}
              <Text style={s.foundStatusText}>
                Buscando… <Text style={s.foundCount}>{devices.length} detectado(s)</Text>
              </Text>
            </View>
            <ScrollView contentContainerStyle={s.deviceList}>
              {devices.map((device) => {
                const isConnected =
                  connectionState === 'connected' && connectedDevice?.id === device.id;
                return (
                  <View key={device.id} style={s.deviceRow}>
                    <View style={s.deviceIcon}>
                      <View style={s.deviceDot} />
                    </View>
                    <View style={s.deviceInfo}>
                      <Text style={s.deviceName}>{device.name}</Text>
                      <Text style={isConnected ? s.deviceConnected : s.deviceMeta}>
                        {isConnected
                          ? 'Conectado · BLE'
                          : device.rssi !== undefined
                            ? `Señal ${device.rssi} dBm`
                            : 'Toca para conectar'}
                      </Text>
                    </View>
                    <Pressable
                      disabled={connecting}
                      style={isConnected ? s.disconnectButton : s.connectButton}
                      onPress={() =>
                        isConnected ? void disconnect() : void handleConnect(device.id)
                      }
                    >
                      {connecting && !isConnected ? (
                        <ActivityIndicator color={palette.white} />
                      ) : (
                        <Text style={isConnected ? s.disconnectLabel : s.connectLabel}>
                          {isConnected ? 'Desconectar' : 'Conectar'}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
            <Text style={s.guide}>¿No aparece tu dispositivo? Comprueba que esté encendido.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bgAlt },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: palette.overlay },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '74%',
    backgroundColor: palette.card,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    borderTopWidth: 1,
    borderColor: palette.borderStrong,
    paddingHorizontal: spacing.xxl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.borderStrong,
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingBottom: spacing.sm,
  },
  title: { ...typography.h2, fontSize: 18, color: palette.ink },
  cancel: { ...typography.label, color: palette.textSecondary },
  emptyBody: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingTop: 54 },
  radar: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: palette.accent,
  },
  ringInner: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 1,
    borderColor: palette.primary,
  },
  radarCore: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.accent },
  centerText: { alignItems: 'center', marginTop: -44 },
  searchingTitle: { fontSize: 15, fontWeight: '700', color: palette.ink },
  searchingText: {
    ...typography.body,
    color: palette.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },
  scanNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    marginBottom: 36,
  },
  noteDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.textMuted },
  noteText: { ...typography.small, color: palette.textSecondary, lineHeight: 17, flex: 1 },
  foundBody: { flex: 1 },
  foundStatus: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: spacing.lg },
  foundStatusText: { ...typography.body, color: palette.textSecondary },
  foundCount: { fontWeight: '700', color: palette.ink },
  deviceList: { gap: spacing.md },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceDot: { width: 12, height: 22, borderRadius: 6, borderWidth: 2, borderColor: palette.ink },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 15, fontWeight: '700', color: palette.ink },
  deviceMeta: { ...typography.small, color: palette.textSecondary, marginTop: 2 },
  deviceConnected: { ...typography.small, color: palette.accent, fontWeight: '600', marginTop: 2 },
  connectButton: {
    minWidth: 88,
    minHeight: 38,
    borderRadius: radii.pill,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  connectLabel: { ...typography.body, fontWeight: '700', color: palette.white },
  disconnectButton: {
    minHeight: 38,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  disconnectLabel: { ...typography.body, fontWeight: '600', color: palette.ink },
  guide: { ...typography.small, color: palette.textMuted, textAlign: 'center', marginBottom: 36 },
  errorBody: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.xl },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBang: { fontSize: 26, fontWeight: '800', color: palette.accent },
  errorTitle: { ...typography.section, color: palette.ink, textAlign: 'center' },
  errorText: {
    ...typography.body,
    color: palette.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  errorActions: { width: '100%', gap: spacing.md, marginTop: spacing.xl },
  primaryButton: {
    height: 54,
    borderRadius: radii.lg,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontSize: 16, fontWeight: '700', color: palette.ink },
  secondaryButton: {
    height: 54,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontSize: 15, fontWeight: '600', color: palette.ink },
});
