import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PrivacyCard, RoomHeader, RoomStatus } from '@/components/RoomUi';
import { RoomVibrationControls } from '@/components/RoomVibrationControls';
import { goBackOr } from '@/navigation/back';
import type { RootStackParamList } from '@/navigation/routes';
import { currentParticipant, useRoomStore } from '@/state/roomStore';
import { palette, radii, spacing, typography } from '@/theme/index';
import { useAdaptiveStyles } from '@/theme/useAdaptiveStyles';
import { useTranslation } from '@/i18n/useTranslation';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomMemberSession'>;

export default function RoomMemberSessionScreen({ navigation }: Props) {
  const s = useAdaptiveStyles(baseStyles);
  const { pick, error: translateError } = useTranslation();
  const room = useRoomStore((state) => state.room);
  const participantId = useRoomStore((state) => state.participantId);
  const connectionState = useRoomStore((state) => state.connectionState);
  const removedReason = useRoomStore((state) => state.removedReason);
  const endedReason = useRoomStore((state) => state.endedReason);
  const error = useRoomStore((state) => state.error);
  const connectedPeers = useRoomStore((state) => state.connectedPeers);
  const peerError = useRoomStore((state) => state.peerError);
  const restoreRoom = useRoomStore((state) => state.restoreRoom);
  const leaveRoom = useRoomStore((state) => state.leaveRoom);
  const sendPattern = useRoomStore((state) => state.sendPattern);
  const sendIntensity = useRoomStore((state) => state.sendIntensity);
  const sendStop = useRoomStore((state) => state.sendStop);
  const remoteControlAllowed = useRoomStore((state) => state.remoteControlAllowed);
  const remoteChannelCount = useRoomStore((state) => state.remoteChannelCount);
  const me = currentParticipant(room, participantId);

  useEffect(() => {
    if (!room && !removedReason && !endedReason) void restoreRoom();
  }, [endedReason, removedReason, restoreRoom, room]);

  useEffect(() => {
    if (removedReason || endedReason) navigation.replace('RoomKicked');
  }, [endedReason, navigation, removedReason]);

  useEffect(() => {
    if (me?.role === 'host') navigation.replace('RoomHostPanel');
  }, [me, navigation]);

  const leave = async () => {
    await sendStop();
    await leaveRoom();
    navigation.popToTop();
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <RoomHeader title={room ? `${pick('Sala', 'Room')} ${room.code}` : pick('Sala', 'Room')} badge="MIEMBRO" onBack={() => goBackOr(navigation, 'Splash')} />
      <View style={s.content}>
        {room ? (
          <>
            <RoomStatus>
              {connectionState === 'reconnecting'
                ? pick('Reconectando…', 'Reconnecting…')
                : connectedPeers > 0
                  ? pick('Control directo conectado', 'Direct control connected')
                  : pick('Preparando canal directo…', 'Preparing direct channel…')}
            </RoomStatus>
            <>
              {!remoteControlAllowed ? <Text style={s.permissionNotice}>{pick('La otra persona todavía no ha permitido el control remoto.', 'The other person has not allowed remote control yet.')}</Text> : null}
              <RoomVibrationControls
                connected={connectedPeers > 0 && remoteControlAllowed}
                channelCount={remoteChannelCount}
                onPattern={sendPattern}
                onIntensity={sendIntensity}
                onStop={sendStop}
              />
              <Pressable accessibilityRole="button" onPress={() => navigation.navigate('RoomCamera')} style={s.camera}>
                <Text style={s.cameraText}>{pick('Abrir cámara de la sala', 'Open room camera')}</Text>
              </Pressable>
            </>
            <PrivacyCard />
            {peerError ? <Text style={s.error}>{translateError(peerError)}</Text> : null}
          </>
        ) : <Text style={s.muted}>{translateError(error) ?? pick('Recuperando la sala…', 'Restoring room…')}</Text>}
        <View style={{ flex: 1 }} />
        <Pressable accessibilityRole="button" onPress={() => void leave()} style={s.leave}><Text style={s.leaveText}>{pick('Salir de la sala', 'Leave room')}</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { flex: 1, padding: spacing.xl, gap: spacing.xl },
  camera: { height: 44, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, backgroundColor: palette.secondary },
  cameraText: { ...typography.label, color: palette.ink, fontWeight: '700' },
  error: { ...typography.small, color: palette.danger, textAlign: 'center' },
  permissionNotice: { ...typography.body, color: palette.textSubtle, textAlign: 'center', lineHeight: 20, backgroundColor: palette.tint, borderRadius: radii.lg, padding: spacing.md },
  muted: { ...typography.body, color: palette.textSecondary, textAlign: 'center', marginTop: 80 },
  leave: { minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  leaveText: { ...typography.label, color: palette.textSecondary },
});
