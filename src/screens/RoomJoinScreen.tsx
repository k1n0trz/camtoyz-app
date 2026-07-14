import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PrimaryButton, PrivacyCard, RoomHeader } from '@/components/RoomUi';
import type { RootStackParamList } from '@/navigation/routes';
import { useRoomStore } from '@/state/roomStore';
import { palette, radii, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomJoin'>;

export default function RoomJoinScreen({ navigation }: Props) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('Invitado');
  const [busy, setBusy] = useState(false);
  const error = useRoomStore((state) => state.error);
  const joinRoom = useRoomStore((state) => state.joinRoom);
  const clearError = useRoomStore((state) => state.clearError);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const normalizedCode = code.toUpperCase().replace(/[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g, '').slice(0, 6);
  const join = async () => {
    setBusy(true);
    const ok = await joinRoom(normalizedCode, name.trim() || 'Invitado');
    setBusy(false);
    if (ok) navigation.replace('RoomMemberSession');
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <RoomHeader title="Unirse a sala" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={s.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View>
          <Text style={s.help}>Introduce el código que te compartió el anfitrión</Text>
          <TextInput
            accessibilityLabel="Código de sala"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            onChangeText={setCode}
            placeholder="ABC234"
            placeholderTextColor={palette.textMuted}
            style={s.codeInput}
            value={normalizedCode}
          />
        </View>
        <View>
          <Text style={s.label}>Tu nombre en la sala</Text>
          <TextInput accessibilityLabel="Nombre en la sala" maxLength={32} onChangeText={setName} style={s.nameInput} value={name} />
        </View>
        <PrivacyCard />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <View style={{ flex: 1 }} />
        <PrimaryButton label="Unirse" disabled={normalizedCode.length !== 6} loading={busy} onPress={() => void join()} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { flex: 1, padding: spacing.xxl, gap: spacing.xxl },
  help: { ...typography.body, color: palette.textSecondary, marginBottom: spacing.md },
  codeInput: { height: 64, backgroundColor: palette.card, borderWidth: 1.5, borderColor: palette.accent, borderRadius: radii.lg, textAlign: 'center', fontSize: 28, fontWeight: '800', letterSpacing: 10, color: palette.ink },
  label: { ...typography.label, color: palette.ink, marginBottom: spacing.sm },
  nameInput: { height: 54, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.borderStrong, borderRadius: radii.lg, paddingHorizontal: spacing.lg, fontSize: 16, color: palette.ink },
  error: { ...typography.small, color: palette.danger, textAlign: 'center' },
});
