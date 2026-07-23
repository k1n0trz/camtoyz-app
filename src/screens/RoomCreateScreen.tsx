import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  PrimaryButton,
  PrivacyCard,
  RoomConsentCard,
  RoomHeader,
  RoomStatus,
} from '@/components/RoomUi';
import { goBackOr } from '@/navigation/back';
import type { RootStackParamList } from '@/navigation/routes';
import { currentParticipant, useRoomStore } from '@/state/roomStore';
import { palette, radii, spacing, typography } from '@/theme/index';
import { useAdaptiveStyles } from '@/theme/useAdaptiveStyles';
import { useTranslation } from '@/i18n/useTranslation';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomCreate'>;

export default function RoomCreateScreen({ navigation }: Props) {
  const s = useAdaptiveStyles(baseStyles);
  const { pick, error: translateError } = useTranslation();
  const [name, setName] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
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
    if (!consentAccepted) return;
    setBusy(true);
    const ok = await createRoom(name.trim() || pick('Anfitrión', 'Host'));
    setBusy(false);
    if (ok) navigation.replace('RoomHostPanel');
  };

  if (room) {
    return (
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <RoomHeader title={pick('Crear sala', 'Create room')} badge="ANFITRIÓN" onBack={() => goBackOr(navigation, 'Splash')} />
        <View style={s.created}>
          <Text style={s.eyebrow}>{pick('CÓDIGO DE INVITACIÓN', 'INVITATION CODE')}</Text>
          <Text selectable style={s.code}>{room.code}</Text>
          <RoomStatus>
            {pick(
              `${room.participants.length} participante${room.participants.length === 1 ? '' : 's'}`,
              `${room.participants.length} participant${room.participants.length === 1 ? '' : 's'}`,
            )}
          </RoomStatus>
          <PrivacyCard />
        </View>
        <View style={s.footer}><PrimaryButton label={pick('Abrir panel de la sala', 'Open room panel')} onPress={() => navigation.replace('RoomHostPanel')} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <RoomHeader title={pick('Interacción remota', 'Remote interaction')} onBack={() => goBackOr(navigation, 'Dashboard')} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={s.heading}>{pick('Crea una sala privada', 'Create a private room')}</Text>
            <Text style={s.copy}>{pick('Comparte el código con la persona que participará. Tú decides quién entra y cuándo termina.', 'Share the code with the other person. You decide who enters and when the room ends.')}</Text>
          </View>
          <View>
            <Text style={s.label}>{pick('Tu nombre en la sala', 'Your name in the room')}</Text>
            <TextInput
              accessibilityLabel={pick('Nombre en la sala', 'Room display name')}
              autoCapitalize="words"
              maxLength={32}
              onChangeText={setName}
              style={s.input}
              value={name}
            />
          </View>
          <PrivacyCard />
          <RoomConsentCard accepted={consentAccepted} onChange={setConsentAccepted} />
          {error ? <Text style={s.error}>{translateError(error)}</Text> : null}
          <PrimaryButton
            label={pick('Crear sala', 'Create room')}
            disabled={!consentAccepted}
            loading={busy}
            onPress={() => void create()}
          />
          <PrimaryButton label={pick('Tengo un código', 'I have a code')} outline onPress={() => navigation.navigate('RoomJoin')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
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
