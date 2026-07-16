import { useEffect } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { RTCView } from 'react-native-webrtc';

import { BackButton } from '@/components/BackButton';
import {
  PrimaryButton,
  RemoteControlSafetyCard,
  RoomStatus,
} from '@/components/RoomUi';
import { RoomVibrationControls } from '@/components/RoomVibrationControls';
import { useTranslation } from '@/i18n/useTranslation';
import { goBackOr } from '@/navigation/back';
import type { RootStackParamList } from '@/navigation/routes';
import { useBleStore } from '@/state/bleStore';
import { currentParticipant, useRoomStore } from '@/state/roomStore';
import type { AppTheme } from '@/theme/index';
import { useThemedStyles } from '@/theme/useThemedStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomCamera'>;

export default function RoomCameraScreen({ navigation }: Props) {
  const s = useThemedStyles(createStyles);
  const { t, pick, error: translateError } = useTranslation();
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
  const remoteChannelCount = useRoomStore((state) => state.remoteChannelCount);
  const setRemoteControlAllowed = useRoomStore((state) => state.setRemoteControlAllowed);
  const emergencyStop = useRoomStore((state) => state.emergencyStop);
  const startVideo = useRoomStore((state) => state.startVideo);
  const stopVideo = useRoomStore((state) => state.stopVideo);
  const toggleCamera = useRoomStore((state) => state.toggleCamera);
  const toggleMicrophone = useRoomStore((state) => state.toggleMicrophone);
  const switchCamera = useRoomStore((state) => state.switchCamera);
  const localChannelCount = useBleStore((state) => state.device?.channelCount ?? 1);
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
    void stopVideo().finally(() => {
      goBackOr(navigation, me?.role === 'host' ? 'RoomHostPanel' : 'RoomMemberSession');
    });
  };

  const copyCode = async () => {
    if (!room) return;
    await Clipboard.setStringAsync(room.code);
    Alert.alert(t('room.codeCopied'), room.code);
  };

  const status = connectionState === 'reconnecting'
    ? t('room.videoConnecting')
    : remoteStream
      ? t('room.videoConnected')
      : totalPeers > 0
        ? t('room.videoConnecting')
        : t('common.loading');

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.stage}>
        {remoteStream ? (
          <RTCView streamURL={remoteStream.toURL()} style={s.remoteVideo} objectFit="cover" zOrder={0} />
        ) : (
          <View style={s.waitingRemote}>
            <Text style={s.waitingTitle}>{totalPeers ? pick('Esperando video', 'Waiting for video') : pick('Sala privada', 'Private room')}</Text>
            <Text style={s.waitingCopy}>
              {totalPeers
                ? pick('La otra persona puede activar su cámara cuando quiera.', 'The other person can enable their camera at any time.')
                : pick('Comparte el código para iniciar una videollamada privada.', 'Share the code to start a private video call.')}
            </Text>
          </View>
        )}

        <View style={s.topOverlay}>
          <BackButton onPress={close} inverted style={s.back} />
          <Pressable
            accessibilityRole={me?.role === 'host' ? 'button' : undefined}
            accessibilityLabel={me?.role === 'host' ? t('room.copyCode') : undefined}
            disabled={me?.role !== 'host'}
            onPress={() => void copyCode()}
            style={s.roomPill}
          >
            <Text style={s.roomTitle}>{room ? `${pick('Sala', 'Room')} · ${room.code}` : pick('Sala', 'Room')}</Text>
            {me?.role === 'host' ? <Text style={s.copyHint}>{t('room.copyCode')}</Text> : null}
          </Pressable>
          <Text style={[s.badge, me?.role === 'member' && s.memberBadge]}>
            {me?.role === 'host' ? t('common.host') : t('common.member')}
          </Text>
        </View>

        <View style={s.statusOverlay}><RoomStatus inverted>{status}</RoomStatus></View>

        {localStream ? (
          <View style={s.localPreview}>
            <RTCView
              streamURL={localStream.toURL()}
              style={s.localVideo}
              objectFit="cover"
              mirror
              zOrder={2}
            />
            {!cameraEnabled ? (
              <View style={s.cameraOff}>
                <Text style={s.cameraOffText}>{t('room.cameraOff')}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={s.startCard}>
            <Text style={s.startTitle}>{t('room.startVideo')}</Text>
            <PrimaryButton
              label={t('room.cameraOn')}
              loading={isVideoStarting}
              onPress={() => void startVideo()}
            />
          </View>
        )}

        <View style={s.bottomOverlay}>
          {localStream ? (
            <View style={s.cameraControls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={microphoneEnabled ? t('room.mute') : t('room.unmute')}
                onPress={toggleMicrophone}
                style={[s.control, !microphoneEnabled && s.controlOff]}
              >
                <Text style={s.controlIcon}>{microphoneEnabled ? '●' : '×'}</Text>
                <Text style={s.controlLabel}>{microphoneEnabled ? t('room.mute') : t('room.unmute')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={cameraEnabled ? t('room.cameraOff') : t('room.cameraOn')}
                onPress={toggleCamera}
                style={[s.control, !cameraEnabled && s.controlOff]}
              >
                <Text style={s.controlIcon}>{cameraEnabled ? '●' : '×'}</Text>
                <Text style={s.controlLabel}>{cameraEnabled ? t('room.cameraOff') : t('room.cameraOn')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('room.switchCamera')}
                onPress={switchCamera}
                style={s.control}
              >
                <Text style={s.controlIcon}>↻</Text>
                <Text style={s.controlLabel}>{t('room.switchCamera')}</Text>
              </Pressable>
            </View>
          ) : null}

          {me?.role === 'member' ? (
            <RoomVibrationControls
              connected={connectedPeers > 0 && remoteControlAllowed}
              channelCount={remoteChannelCount}
              variant="overlay"
              onPattern={sendPattern}
              onIntensity={sendIntensity}
              onStop={sendStop}
            />
          ) : me?.role === 'host' ? (
            <RemoteControlSafetyCard
              allowed={remoteControlAllowed}
              connected={connectedPeers > 0}
              onChange={setRemoteControlAllowed}
              onStop={emergencyStop}
              compact
              inverted
            />
          ) : null}

          {mediaError || peerError ? (
            <Text style={s.error}>{translateError(mediaError ?? peerError)}</Text>
          ) : null}
          {me?.role === 'host' && localChannelCount > 1 ? (
            <Text style={s.capabilityHint}>
              {pick(
                `${localChannelCount} motores disponibles para control remoto`,
                `${localChannelCount} motors available for remote control`,
              )}
            </Text>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  stage: {
    flex: 1,
    margin: theme.spacing.sm,
    borderRadius: theme.radii.frame,
    overflow: 'hidden' as const,
    backgroundColor: '#160D22',
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  remoteVideo: { flex: 1 },
  waitingRemote: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: theme.spacing.xxl,
    paddingBottom: 270,
  },
  waitingTitle: { ...theme.typography.h2, color: '#FFFFFF', textAlign: 'center' as const },
  waitingCopy: {
    ...theme.typography.body,
    color: '#E7D7EC',
    textAlign: 'center' as const,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
  },
  topOverlay: {
    position: 'absolute' as const,
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    right: theme.spacing.sm,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm,
  },
  back: { backgroundColor: 'rgba(20,10,30,.72)' },
  roomPill: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(20,10,30,.72)',
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.lg,
  },
  roomTitle: { ...theme.typography.label, color: '#FFFFFF', fontWeight: '800' as const },
  copyHint: { fontSize: 9, color: '#E7D7EC', marginTop: 1 },
  badge: {
    backgroundColor: theme.colors.accent,
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: theme.radii.pill,
  },
  memberBadge: { backgroundColor: theme.colors.secondary, color: theme.colors.ink },
  statusOverlay: {
    position: 'absolute' as const,
    top: 70,
    left: 0,
    right: 0,
    alignItems: 'center' as const,
  },
  localPreview: {
    position: 'absolute' as const,
    right: theme.spacing.md,
    top: 116,
    width: 112,
    height: 164,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    overflow: 'hidden' as const,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 5,
    elevation: 5,
  },
  localVideo: { flex: 1 },
  cameraOff: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#241833',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cameraOffText: { ...theme.typography.small, color: '#FFFFFF', textAlign: 'center' as const },
  startCard: {
    position: 'absolute' as const,
    top: '36%' as const,
    left: theme.spacing.xxl,
    right: theme.spacing.xxl,
    backgroundColor: 'rgba(20,10,30,.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.25)',
    borderRadius: theme.radii.cardLg,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  startTitle: { ...theme.typography.section, color: '#FFFFFF', textAlign: 'center' as const },
  bottomOverlay: {
    position: 'absolute' as const,
    left: theme.spacing.sm,
    right: theme.spacing.sm,
    bottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  cameraControls: { flexDirection: 'row' as const, justifyContent: 'center' as const, gap: theme.spacing.sm },
  control: {
    flex: 1,
    minHeight: 52,
    borderRadius: theme.radii.lg,
    backgroundColor: 'rgba(20,10,30,.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.34)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 4,
  },
  controlOff: { borderColor: theme.colors.primary, backgroundColor: 'rgba(83,37,67,.82)' },
  controlIcon: { fontSize: 16, fontWeight: '800' as const, color: theme.colors.primary, lineHeight: 18 },
  controlLabel: {
    ...theme.typography.small,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    marginTop: 2,
    fontWeight: '700' as const,
  },
  error: {
    ...theme.typography.small,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    backgroundColor: 'rgba(165,59,101,.85)',
    borderRadius: theme.radii.md,
    padding: theme.spacing.sm,
  },
  capabilityHint: {
    ...theme.typography.small,
    color: '#E7D7EC',
    textAlign: 'center' as const,
  },
});
