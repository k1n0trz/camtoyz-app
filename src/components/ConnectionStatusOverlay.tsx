import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/preferences/AppPreferences';
import { useTranslation } from '@/i18n/useTranslation';
import { useBleStore } from '@/state/bleStore';
import { radii, spacing, typography } from '@/theme/index';

export function ConnectionStatusOverlay() {
  const theme = useAppTheme();
  const { pick } = useTranslation();
  const connectionState = useBleStore((state) => state.connectionState);
  const device = useBleStore((state) => state.device);

  if (device?.battery !== undefined && device.battery <= 15 && connectionState === 'connected') {
    return (
      <SafeAreaView pointerEvents="box-none" style={s.bannerWrap} edges={['top']}>
        <View style={[s.banner, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderStrong }]}>
          <View style={[s.bannerDot, { backgroundColor: theme.colors.accent }]} />
          <Text style={[s.bannerText, { color: theme.colors.ink }]}>
            {pick('Batería baja', 'Low battery')} · {device.battery}%
          </Text>
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
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  bannerDot: { width: 8, height: 8, borderRadius: 4 },
  bannerText: { ...typography.label },
});
