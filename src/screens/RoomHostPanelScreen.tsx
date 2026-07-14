import { useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PrimaryButton, PrivacyCard, RoomHeader } from '@/components/RoomUi';
import type { RootStackParamList } from '@/navigation/routes';
import { currentParticipant, useRoomStore } from '@/state/roomStore';
import { palette, radii, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomHostPanel'>;

const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');

export default function RoomHostPanelScreen({ navigation }: Props) {
  const room = useRoomStore((state) => state.room);
  const participantId = useRoomStore((state) => state.participantId);
  const error = useRoomStore((state) => state.error);
  const restoreRoom = useRoomStore((state) => state.restoreRoom);
  const kick = useRoomStore((state) => state.kick);
  const block = useRoomStore((state) => state.block);
  const endRoom = useRoomStore((state) => state.endRoom);
  const me = currentParticipant(room, participantId);

  useEffect(() => {
    if (!room) void restoreRoom();
  }, [restoreRoom, room]);

  useEffect(() => {
    if (me && me.role !== 'host') navigation.replace('RoomMemberSession');
  }, [me, navigation]);

  const confirmBlock = (id: string, name: string) => Alert.alert(
    `¿Bloquear a ${name}?`,
    'Se le expulsará y no podrá volver a unirse con este código desde esta instalación.',
    [{ text: 'Cancelar', style: 'cancel' }, { text: 'Bloquear', style: 'destructive', onPress: () => void block(id) }],
  );

  const confirmEnd = () => Alert.alert(
    '¿Terminar la sesión para todos?',
    'El código dejará de funcionar. Esta acción no se puede deshacer.',
    [{ text: 'Cancelar', style: 'cancel' }, { text: 'Terminar', style: 'destructive', onPress: async () => {
      if (await endRoom()) navigation.popToTop();
    } }],
  );

  if (!room) {
    return (
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <RoomHeader title="Participantes" badge="ANFITRIÓN" onBack={() => navigation.goBack()} />
        <View style={s.center}><Text style={s.muted}>{error ?? 'Recuperando la sala…'}</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <RoomHeader title={`Participantes · ${room.participants.length}`} badge="ANFITRIÓN" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={s.content}>
        <Text selectable style={s.roomCode}>SALA {room.code}</Text>
        {room.participants.map((participant) => {
          const self = participant.id === participantId;
          return (
            <View key={participant.id} style={[s.participant, !participant.connected && s.offline]}>
              <View style={[s.avatar, participant.role === 'host' && s.hostAvatar]}><Text style={s.avatarText}>{initials(participant.displayName)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{self ? 'Tú' : participant.displayName}</Text>
                <Text style={s.meta}>{participant.connected ? 'Conectado' : 'Reconectando…'}</Text>
              </View>
              {participant.role === 'host' ? <Text style={s.hostBadge}>ANFITRIÓN</Text> : (
                <View style={s.actions}>
                  <Pressable onPress={() => void kick(participant.id)} style={s.action}><Text style={s.actionText}>Expulsar</Text></Pressable>
                  <Pressable onPress={() => confirmBlock(participant.id, participant.displayName)} style={[s.action, s.block]}><Text style={s.blockText}>Bloquear</Text></Pressable>
                </View>
              )}
            </View>
          );
        })}
        <PrivacyCard />
        {error ? <Text style={s.error}>{error}</Text> : null}
      </ScrollView>
      <View style={s.footer}><PrimaryButton label="Terminar sesión para todos" outline onPress={confirmEnd} /></View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { padding: spacing.xl, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { ...typography.body, color: palette.textSecondary },
  roomCode: { ...typography.mono, color: palette.textSecondary, textAlign: 'center', marginBottom: spacing.sm },
  participant: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: radii.card, padding: spacing.lg },
  offline: { opacity: 0.55 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.tint, alignItems: 'center', justifyContent: 'center' },
  hostAvatar: { backgroundColor: palette.secondary },
  avatarText: { fontSize: 11, fontWeight: '700', color: palette.ink },
  name: { ...typography.label, color: palette.ink, fontWeight: '700' },
  meta: { fontSize: 11, color: palette.textSecondary, marginTop: 2 },
  hostBadge: { backgroundColor: palette.accent, color: palette.white, fontSize: 9, fontWeight: '800', letterSpacing: 1, borderRadius: radii.pill, paddingVertical: 4, paddingHorizontal: 9 },
  actions: { flexDirection: 'row', gap: 6 },
  action: { borderWidth: 1, borderColor: palette.borderStrong, borderRadius: radii.pill, paddingVertical: 7, paddingHorizontal: 10 },
  block: { borderColor: palette.accent },
  actionText: { fontSize: 11, color: palette.ink, fontWeight: '600' },
  blockText: { fontSize: 11, color: palette.accent, fontWeight: '700' },
  error: { ...typography.small, color: palette.danger, textAlign: 'center' },
  footer: { padding: spacing.xl },
});
