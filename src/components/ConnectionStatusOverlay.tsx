import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBleStore } from '@/state/bleStore';
import { palette, radii, spacing, typography } from '@/theme';

export function ConnectionStatusOverlay() {
  const connectionState = useBleStore((state) => state.connectionState);
  const device = useBleStore((state) => state.device);
  const error = useBleStore((state) => state.error);
  const retryConnection = useBleStore((state) => state.retryConnection);

  if (device?.battery !== undefined && device.battery <= 15 && connectionState === 'connected') {
    return (
      <SafeAreaView pointerEvents="box-none" style={s.bannerWrap} edges={['top']}>
        <View style={s.banner}>
          <View style={s.bannerDot} />
          <Text style={s.bannerText}>Batería baja · {device.battery}%</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (device && (connectionState === 'reconnecting' || connectionState === 'error')) {
    return (
      <View style={s.overlay}>
        <View style={s.card}>
          {connectionState === 'reconnecting' ? (
            <ActivityIndicator size="large" color={palette.accent} />
          ) : (
            <View style={s.errorIcon}>
              <Text style={s.errorBang}>!</Text>
            </View>
          )}
          <Text style={s.title}>
            {connectionState === 'reconnecting' ? 'Reconectando…' : 'Conexión interrumpida'}
          </Text>
          <Text style={s.body}>
            {connectionState === 'reconnecting'
              ? `Intentando recuperar la conexión con ${device.name}.`
              : error ?? 'No fue posible recuperar la conexión Bluetooth.'}
          </Text>
          <Pressable style={s.button} onPress={() => void retryConnection()}>
            <Text style={s.buttonLabel}>Reconectar ahora</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return null;
}

const s = StyleSheet.create({
  bannerWrap: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: spacing.xl },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  bannerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.accent },
  bannerText: { ...typography.label, color: palette.ink },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: palette.card,
    borderRadius: radii.cardLg,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  errorIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    borderColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBang: { fontSize: 24, fontWeight: '800', color: palette.accent },
  title: { ...typography.h2, color: palette.ink, marginTop: spacing.xl, textAlign: 'center' },
  body: {
    ...typography.body,
    color: palette.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  button: {
    alignSelf: 'stretch',
    height: 50,
    borderRadius: radii.lg,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  buttonLabel: { ...typography.label, color: palette.ink },
});
