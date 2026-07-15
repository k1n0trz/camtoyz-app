import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PrimaryButton, PrivacyCard, RoomHeader, RoomStatus } from '@/components/RoomUi';
import type { RootStackParamList } from '@/navigation/routes';
import { currentParticipant, useRoomStore } from '@/state/roomStore';
import { palette, radii, spacing, typography } from '@/theme/index';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomCreate'>;

export default function RoomCreateScreen({ navigation }: Props) {
  const [name, setName] = useState('Anfitrión');
  const [busy, setBusy] = useState(false);
  const room = useRoomStore((state) => state.room);
  const participantId = useRoomStore((state) => state.participantId);
  const error = useRoomStore((state) => state.error);
  const createRoom = useRoomStore((state) => state.createRoom);
  const restoreRoom = useRoomStore((state) => state.restoreRoom);

  useEffect(() => {
    if (!room) {
      void restoreRoom();
      return;
    }
    const me = currentParticipant(room, participantId);
    if (me) navigation.replace(me.role === 'host' ? 'RoomHostPanel' : 'RoomMemberSession');
  }, [navigation, participantId, restoreRoom, room]);

  const create = async () => {
    setBusy(true);
    const ok = await createRoom(name.trim() || 'Anfitrión');
    setBusy(false);
    if (ok) navigation.replace('RoomHostPanel');
  };

  if (room) {
    return (
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <RoomHeader title="Crear sala" badge="ANFITRIÓN" onBack={() => navigation.goBack()} />
        <View style={s.created}>
          <Text style={s.eyebrow}>CÓDIGO DE INVITACIÓN</Text>
          <Text selectable style={s.code}>{room.code}</Text>
          <RoomStatus>{room.participants.length} participante{room.participants.length === 1 ? '' : 's'}</RoomStatus>
          <PrivacyCard />
        </View>
        <View style={s.footer}><PrimaryButton label="Abrir panel de la sala" onPress={() => navigation.replace('RoomHostPanel')} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <RoomHeader title="Interacción remota" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={s.heading}>Crea una sala privada</Text>
            <Text style={s.copy}>Comparte el código con la persona que participará. Tú decides quién entra y cuándo termina.</Text>
          </View>
          <View>
            <Text style={s.label}>Tu nombre en la sala</Text>
            <TextInput
              accessibilityLabel="Nombre en la sala"
              autoCapitalize="words"
              maxLength={32}
              onChangeText={setName}
              style={s.input}
              value={name}
            />
          </View>
          <PrivacyCard />
          {error ? <Text style={s.error}>{error}</Text> : null}
          <PrimaryButton label="Crear sala" loading={busy} onPress={() => void create()} />
          <PrimaryButton label="Tengo un código" outline onPress={() => navigation.replace('RoomJoin')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { padding: spacing.xxl, gap: spacing.xl },
  created: { flex: 1, padding: spacing.xxl, alignItems: 'center', justifyContent: 'center', gap: spacing.xxl },
  eyebrow: { ...typography.mono, color: palette.textSecondary },
  code: { fontSize: 36, fontWeight: '800', letterSpacing: 8, color: palette.ink },
  heading: { ...typography.h1, color: palette.ink },
  copy: { ...typography.body, color: palette.textSecondary, lineHeight: 20, marginTop: spacing.sm },
  label: { ...typography.label, color: palette.ink, marginBottom: spacing.sm },
  input: { minHeight: 54, borderWidth: 1, borderColor: palette.borderStrong, borderRadius: radii.lg, backgroundColor: palette.card, paddingHorizontal: spacing.lg, fontSize: 16, color: palette.ink },
  error: { ...typography.small, color: palette.danger, textAlign: 'center' },
  footer: { padding: spacing.xxl },
});
