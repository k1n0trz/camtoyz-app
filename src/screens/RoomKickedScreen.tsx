import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PrimaryButton } from '@/components/RoomUi';
import type { RootStackParamList } from '@/navigation/routes';
import { useRoomStore } from '@/state/roomStore';
import { palette, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomKicked'>;

export default function RoomKickedScreen({ navigation }: Props) {
  const removedReason = useRoomStore((state) => state.removedReason);
  const endedReason = useRoomStore((state) => state.endedReason);
  const clearOutcome = useRoomStore((state) => state.clearOutcome);
  const blocked = removedReason === 'blocked';
  const title = removedReason
    ? blocked ? 'Has sido bloqueado' : 'Has sido expulsado de la sala'
    : 'La sala ha terminado';
  const copy = removedReason
    ? blocked
      ? 'El anfitrión finalizó tu acceso y esta instalación no puede volver a unirse con el mismo código.'
      : 'El anfitrión finalizó tu acceso. Podrás volver a intentarlo mientras el código siga activo.'
    : endedReason === 'host_disconnected'
      ? 'El anfitrión perdió la conexión y no volvió dentro del tiempo de recuperación.'
      : 'El código ya no está activo.';

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
      <View style={s.footer}><PrimaryButton label="Volver al inicio" onPress={close} /></View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36, gap: spacing.xxl },
  icon: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: palette.accent, alignItems: 'center', justifyContent: 'center' },
  slash: { width: 32, height: 3, borderRadius: 2, backgroundColor: palette.accent, transform: [{ rotate: '-45deg' }] },
  title: { ...typography.h1, color: palette.ink, textAlign: 'center' },
  copy: { fontSize: 14, color: palette.textSecondary, lineHeight: 22, textAlign: 'center', marginTop: spacing.md },
  footer: { padding: spacing.xxl },
});
