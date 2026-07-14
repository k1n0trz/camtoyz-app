import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PrivacyCard, RoomHeader, RoomStatus } from '@/components/RoomUi';
import IntensitySlider from '@/components/IntensitySlider';
import { PatternTile } from '@/components/PatternTile';
import { featuredPatterns } from '@/features/patterns/catalog';
import type { RootStackParamList } from '@/navigation/routes';
import { currentParticipant, useRoomStore } from '@/state/roomStore';
import { palette, radii, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomMemberSession'>;

export default function RoomMemberSessionScreen({ navigation }: Props) {
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
  const [activePattern, setActivePattern] = useState<number>();
  const [intensity, setIntensity] = useState(45);
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

  const changeIntensity = useCallback((value: number) => {
    setIntensity(value);
    void sendIntensity(value);
  }, [sendIntensity]);

  const togglePattern = async (pattern: number) => {
    if (activePattern === pattern) {
      if (await sendStop()) setActivePattern(undefined);
    } else if (await sendPattern(pattern)) {
      setActivePattern(pattern);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <RoomHeader title={room ? `Sala ${room.code}` : 'Sala'} badge="MIEMBRO" onBack={() => navigation.goBack()} />
      <View style={s.content}>
        {room ? (
          <>
            <RoomStatus>{connectionState === 'reconnecting' ? 'Reconectando…' : connectedPeers > 0 ? 'Control directo conectado' : 'Preparando canal directo…'}</RoomStatus>
            <View style={s.card}>
              <Text style={s.cardTitle}>Vibración remota</Text>
              <View style={s.patterns}>
                {featuredPatterns.map((pattern) => (
                  <PatternTile
                    key={pattern.id}
                    pattern={pattern}
                    active={activePattern === pattern.id}
                    disabled={connectedPeers === 0}
                    onPress={() => void togglePattern(pattern.id)}
                  />
                ))}
              </View>
              <View style={s.intensityHead}><Text style={s.intensityLabel}>Intensidad</Text><Text style={s.intensityValue}>{intensity}%</Text></View>
              <IntensitySlider value={intensity} onChange={changeIntensity} />
              <Pressable disabled={connectedPeers === 0} onPress={() => { void sendStop(); setActivePattern(undefined); }} style={s.stop}><Text style={s.stopText}>Detener vibración</Text></Pressable>
            </View>
            <PrivacyCard />
            {peerError ? <Text style={s.error}>{peerError}</Text> : null}
          </>
        ) : <Text style={s.muted}>{error ?? 'Recuperando la sala…'}</Text>}
        <View style={{ flex: 1 }} />
        <Pressable accessibilityRole="button" onPress={() => void leave()} style={s.leave}><Text style={s.leaveText}>Salir de la sala</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { flex: 1, padding: spacing.xl, gap: spacing.xl },
  card: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: radii.cardLg, padding: spacing.xl },
  cardTitle: { ...typography.section, color: palette.ink },
  cardCopy: { ...typography.body, color: palette.textSecondary, lineHeight: 20, marginTop: spacing.sm },
  patterns: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.lg },
  intensityHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl },
  intensityLabel: { ...typography.label, color: palette.ink },
  intensityValue: { ...typography.label, color: palette.accent, fontWeight: '800' },
  stop: { height: 44, borderWidth: 1.5, borderColor: palette.accent, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  stopText: { ...typography.label, color: palette.accent, fontWeight: '700' },
  error: { ...typography.small, color: palette.danger, textAlign: 'center' },
  muted: { ...typography.body, color: palette.textSecondary, textAlign: 'center', marginTop: 80 },
  leave: { minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  leaveText: { ...typography.label, color: palette.textSecondary },
});
