import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PrimaryButton } from '@/components/RoomUi';
import type { RootStackParamList } from '@/navigation/routes';
import { useRoomStore } from '@/state/roomStore';
import { palette, spacing, typography } from '@/theme/index';
import { useAdaptiveStyles } from '@/theme/useAdaptiveStyles';
import { useTranslation } from '@/i18n/useTranslation';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomKicked'>;

export default function RoomKickedScreen({ navigation }: Props) {
  const s = useAdaptiveStyles(baseStyles);
  const { pick } = useTranslation();
  const removedReason = useRoomStore((state) => state.removedReason);
  const endedReason = useRoomStore((state) => state.endedReason);
  const clearOutcome = useRoomStore((state) => state.clearOutcome);
  const blocked = removedReason === 'blocked';
  const title = removedReason
    ? blocked ? pick('Has sido bloqueado', 'You have been blocked') : pick('Has sido expulsado de la sala', 'You have been removed from the room')
    : pick('La sala ha terminado', 'The room has ended');
  const copy = removedReason
    ? blocked
      ? pick('El anfitrión finalizó tu acceso y esta instalación no puede volver a unirse con el mismo código.', 'The host ended your access and this installation cannot rejoin using the same code.')
      : pick('El anfitrión finalizó tu acceso. Podrás volver a intentarlo mientras el código siga activo.', 'The host ended your access. You may try again while the code remains active.')
    : endedReason === 'host_disconnected'
      ? pick('El anfitrión perdió la conexión y no volvió dentro del tiempo de recuperación.', 'The host lost connection and did not return within the recovery period.')
      : pick('El código ya no está activo.', 'The code is no longer active.');

  const close = () => {
    clearOutcome();
    navigation.popToTop();
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.content}>
        <View style={s.icon}><View style={s.slash} /></View>
        <View>
          <Text style={s.title}>{title}</Text>
          <Text style={s.copy}>{copy}</Text>
        </View>
      </View>
      <View style={s.footer}><PrimaryButton label={pick('Volver al inicio', 'Back to start')} onPress={close} /></View>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36, gap: spacing.xxl },
  icon: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: palette.accent, alignItems: 'center', justifyContent: 'center' },
  slash: { width: 32, height: 3, borderRadius: 2, backgroundColor: palette.accent, transform: [{ rotate: '-45deg' }] },
  title: { ...typography.h1, color: palette.ink, textAlign: 'center' },
  copy: { fontSize: 14, color: palette.textSecondary, lineHeight: 22, textAlign: 'center', marginTop: spacing.md },
  footer: { padding: spacing.xxl },
});
