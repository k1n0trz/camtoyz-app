import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RTCView } from 'react-native-webrtc';

import { PrimaryButton, PrivacyCard, RemoteControlSafetyCard, RoomHeader, RoomStatus } from '@/components/RoomUi';
import { RoomVibrationControls } from '@/components/RoomVibrationControls';
import type { RootStackParamList } from '@/navigation/routes';
import { currentParticipant, useRoomStore } from '@/state/roomStore';
import { palette, radii, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomCamera'>;

export default function RoomCameraScreen({ navigation }: Props) {
  const room = useRoomStore((state) => state.room);
  const participantId = useRoomStore((state) => state.participantId);
  const connectionState = useRoomStore((state) => state.connectionState);
  const removedReason = useRoomStore((state) => state.removedReason);
  const endedReason = useRoomStore((state) => state.endedReason);
  const restoreRoom = useRoomStore((state) => state.restoreRoom);
  const localStream = useRoomStore((state) => state.localStream);
  const remoteStream = useRoomStore((state) => state.remoteStream);
  const cameraEnabled = useRoomStore((state) => state.cameraEnabled);
  const microphoneEnabled = useRoomStore((state) => state.microphoneEnabled);
  const isVideoStarting = useRoomStore((state) => state.isVideoStarting);
  const mediaError = useRoomStore((state) => state.mediaError);
  const totalPeers = useRoomStore((state) => state.totalPeers);
  const connectedPeers = useRoomStore((state) => state.connectedPeers);
  const peerError = useRoomStore((state) => state.peerError);
  const sendPattern = useRoomStore((state) => state.sendPattern);
  const sendIntensity = useRoomStore((state) => state.sendIntensity);
  const sendStop = useRoomStore((state) => state.sendStop);
  const remoteControlAllowed = useRoomStore((state) => state.remoteControlAllowed);
  const setRemoteControlAllowed = useRoomStore((state) => state.setRemoteControlAllowed);
  const emergencyStop = useRoomStore((state) => state.emergencyStop);
  const startVideo = useRoomStore((state) => state.startVideo);
  const stopVideo = useRoomStore((state) => state.stopVideo);
  const toggleCamera = useRoomStore((state) => state.toggleCamera);
  const toggleMicrophone = useRoomStore((state) => state.toggleMicrophone);
  const switchCamera = useRoomStore((state) => state.switchCamera);
  const me = currentParticipant(room, participantId);

  useEffect(() => {
    if (!room && !removedReason && !endedReason) void restoreRoom();
  }, [endedReason, removedReason, restoreRoom, room]);

  useEffect(() => {
    if (removedReason || endedReason) navigation.replace('RoomKicked');
  }, [endedReason, navigation, removedReason]);

  useEffect(() => () => {
    void stopVideo();
  }, [stopVideo]);

  const close = () => {
    void stopVideo().finally(() => navigation.goBack());
  };

  const status = connectionState === 'reconnecting'
    ? 'Reconectando la sala…'
    : remoteStream
      ? 'Video directo conectado'
      : totalPeers > 0
        ? 'Esperando el video de la otra persona…'
        : 'Esperando a que se una alguien…';

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <RoomHeader
        title={room ? `Sala · ${room.code}` : 'Sala'}
        badge={me?.role === 'host' ? 'ANFITRIÓN' : 'MIEMBRO'}
        onBack={close}
      />
      <ScrollView contentContainerStyle={s.content}>
        <RoomStatus>{status}</RoomStatus>
        <View style={s.stage}>
          {remoteStream ? (
            <RTCView streamURL={remoteStream.toURL()} style={s.remoteVideo} objectFit="cover" zOrder={0} />
          ) : (
            <View style={s.waitingRemote}>
              <Text style={s.waitingTitle}>{totalPeers ? 'Esperando video' : 'Sala privada'}</Text>
              <Text style={s.waitingCopy}>
                {totalPeers
                  ? 'La otra persona puede activar su cámara cuando quiera.'
                  : 'Comparte el código de la sala para iniciar una videollamada privada.'}
              </Text>
            </View>
          )}
          {localStream ? (
            <View style={s.localPreview}>
              <RTCView streamURL={localStream.toURL()} style={s.localVideo} objectFit="cover" mirror zOrder={1} />
              {!cameraEnabled ? <View style={s.cameraOff}><Text style={s.cameraOffText}>Cámara apagada</Text></View> : null}
            </View>
          ) : null}
        </View>

        {!localStream ? (
          <View style={s.startCard}>
            <Text style={s.startTitle}>Activa tu cámara cuando quieras</Text>
            <Text style={s.startCopy}>Tu cámara y micrófono solo se comparten dentro de esta sala privada.</Text>
            <PrimaryButton label="Activar cámara" loading={isVideoStarting} onPress={() => void startVideo()} />
          </View>
        ) : (
          <View style={s.controls}>
            <Pressable accessibilityRole="button" onPress={toggleMicrophone} style={[s.control, !microphoneEnabled && s.controlOff]}>
              <Text style={s.controlIcon}>{microphoneEnabled ? '●' : '×'}</Text>
              <Text style={s.controlLabel}>{microphoneEnabled ? 'Silenciar' : 'Micrófono'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={toggleCamera} style={[s.control, !cameraEnabled && s.controlOff]}>
              <Text style={s.controlIcon}>{cameraEnabled ? '●' : '×'}</Text>
              <Text style={s.controlLabel}>{cameraEnabled ? 'Apagar cámara' : 'Encender cámara'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={switchCamera} style={s.control}>
              <Text style={s.controlIcon}>↻</Text>
              <Text style={s.controlLabel}>Cambiar</Text>
            </Pressable>
          </View>
        )}

        {me?.role === 'member' ? (
          <>
            {!remoteControlAllowed ? <Text style={s.permissionNotice}>La otra persona todavía no ha permitido el control remoto.</Text> : null}
            <RoomVibrationControls
              connected={connectedPeers > 0 && remoteControlAllowed}
              onPattern={sendPattern}
              onIntensity={sendIntensity}
              onStop={sendStop}
            />
          </>
        ) : me?.role === 'host' ? (
          <RemoteControlSafetyCard
            allowed={remoteControlAllowed}
            connected={connectedPeers > 0}
            onChange={setRemoteControlAllowed}
            onStop={emergencyStop}
          />
        ) : null}
        {mediaError ? <Text style={s.error}>{mediaError}</Text> : null}
        {peerError ? <Text style={s.error}>{peerError}</Text> : null}
        <PrivacyCard />
        {localStream ? <Pressable accessibilityRole="button" onPress={close} style={s.stopVideo}><Text style={s.stopVideoText}>Detener cámara y volver</Text></Pressable> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  stage: {
    height: 330,
    borderRadius: radii.cardLg,
    overflow: 'hidden',
    backgroundColor: palette.ink,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  remoteVideo: { flex: 1 },
  waitingRemote: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  waitingTitle: { ...typography.section, color: palette.white, textAlign: 'center' },
  waitingCopy: { ...typography.body, color: palette.tint, textAlign: 'center', lineHeight: 20, marginTop: spacing.sm },
  localPreview: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 108,
    height: 144,
    backgroundColor: palette.card,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: palette.card,
    zIndex: 2,
    elevation: 2,
  },
  localVideo: { flex: 1 },
  cameraOff: { ...StyleSheet.absoluteFillObject, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' },
  cameraOffText: { ...typography.small, color: palette.white, textAlign: 'center' },
  startCard: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: radii.cardLg, padding: spacing.xl, gap: spacing.md },
  startTitle: { ...typography.section, color: palette.ink },
  startCopy: { ...typography.body, color: palette.textSecondary, lineHeight: 20 },
  controls: { flexDirection: 'row', gap: spacing.sm },
  control: { flex: 1, minHeight: 72, borderRadius: radii.lg, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.borderStrong, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  controlOff: { borderColor: palette.accent, backgroundColor: palette.tint },
  controlIcon: { fontSize: 20, fontWeight: '800', color: palette.accent, lineHeight: 24 },
  controlLabel: { ...typography.small, color: palette.ink, textAlign: 'center', marginTop: 3, fontWeight: '700' },
  error: { ...typography.small, color: palette.danger, textAlign: 'center', lineHeight: 18 },
  permissionNotice: { ...typography.body, color: palette.textSubtle, textAlign: 'center', lineHeight: 20, backgroundColor: palette.tint, borderRadius: radii.lg, padding: spacing.md },
  stopVideo: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  stopVideoText: { ...typography.label, color: palette.textSecondary },
});
