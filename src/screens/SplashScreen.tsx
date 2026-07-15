import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/routes';
import { Logo } from '@/components/Logo';
import { loadRoomSession, type StoredRoomSession } from '@/features/room/roomIdentity';
import { currentParticipant, useRoomStore } from '@/state/roomStore';
import { palette, radii, spacing, typography } from '@/theme/index';

/**
 * 01 Splash — patrón de referencia para el resto de pantallas.
 * Layout fiel al frame de diseño: logo centrado y CTA inmediata,
 * CTA primario (rosa) + secundario (outline).
 */
type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const restoreRoom = useRoomStore((state) => state.restoreRoom);
  const [savedSession, setSavedSession] = useState<StoredRoomSession>();
  const [resumingRoom, setResumingRoom] = useState(false);
  const [resumeError, setResumeError] = useState<string>();
  const appVersion = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '0.1.0';

  useEffect(() => {
    let mounted = true;
    void loadRoomSession().then((session) => {
      if (mounted) setSavedSession(session);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const resumeRoom = async () => {
    setResumingRoom(true);
    setResumeError(undefined);
    const restored = await restoreRoom();
    setResumingRoom(false);

    if (!restored) {
      const remainingSession = await loadRoomSession();
      setSavedSession(remainingSession);
      setResumeError(
        remainingSession
          ? 'No fue posible volver a la sala. Inténtalo de nuevo en unos segundos.'
          : 'Esta sala ya no está disponible.',
      );
      return;
    }

    const { room, participantId } = useRoomStore.getState();
    const participant = currentParticipant(room, participantId);
    if (!participant) {
      setResumeError('No fue posible recuperar tu acceso a la sala.');
      return;
    }

    navigation.navigate(participant.role === 'host' ? 'RoomHostPanel' : 'RoomMemberSession');
  };

  return (
    <SafeAreaView style={s.root}>
      <View style={s.center}>
        <Logo width={230} color={palette.accent} />
        <View style={s.status}>
          <Text style={s.statusTitle}>Todo listo para conectar</Text>
          <Text style={s.statusSub}>
            Mantén pulsado el botón{'\n'}del dispositivo para encenderlo
          </Text>
        </View>
      </View>
      <View style={s.actions}>
        {savedSession ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Volver a la sala ${savedSession.roomCode}`}
            disabled={resumingRoom}
            style={[s.resume, resumingRoom && s.resumeDisabled]}
            onPress={() => void resumeRoom()}
          >
            <Text style={s.resumeLabel}>{resumingRoom ? 'Volviendo a tu sala…' : `Volver a la sala ${savedSession.roomCode}`}</Text>
          </Pressable>
        ) : null}
        <Pressable style={s.primary} onPress={() => navigation.navigate('Scan')}>
          <Text style={s.primaryLabel}>Comenzar juego</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continuar sin juguete y unirse a una sala"
          style={s.secondary}
          onPress={() => navigation.navigate('RoomJoin')}
        >
          <Text style={s.secondaryLabel}>Continuar sin juguete</Text>
        </Pressable>
        {resumeError ? <Text style={s.resumeError}>{resumeError}</Text> : null}
        <Text style={s.version}>Versión {appVersion}</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg, paddingHorizontal: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 56 },
  status: { alignItems: 'center', gap: 10 },
  statusTitle: { ...typography.label, fontSize: 15, fontWeight: '700', color: palette.ink },
  statusSub: { ...typography.body, color: palette.textSecondary, textAlign: 'center', lineHeight: 20 },
  actions: { paddingBottom: 30, gap: 12 },
  resume: {
    height: 48,
    backgroundColor: palette.secondary,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeDisabled: { opacity: 0.55 },
  resumeLabel: { fontSize: 15, fontWeight: '700', color: palette.ink },
  primary: {
    height: 54,
    backgroundColor: palette.primary,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontSize: 16, fontWeight: '700', color: palette.ink },
  secondary: {
    height: 54,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontSize: 15, fontWeight: '600', color: palette.ink },
  resumeError: { ...typography.small, color: palette.danger, textAlign: 'center', lineHeight: 17 },
  version: { ...typography.small, color: palette.textMuted, textAlign: 'center', marginTop: 2 },
});
