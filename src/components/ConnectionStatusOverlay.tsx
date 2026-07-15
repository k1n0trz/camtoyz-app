import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBleStore } from '@/state/bleStore';
import { palette, radii, spacing, typography } from '@/theme/index';

export function ConnectionStatusOverlay() {
  const connectionState = useBleStore((state) => state.connectionState);
  const device = useBleStore((state) => state.device);

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
});
