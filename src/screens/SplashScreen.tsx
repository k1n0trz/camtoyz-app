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
import { useAdaptiveStyles } from '@/theme/useAdaptiveStyles';
import { useAppPreferences, useAppTheme } from '@/preferences/AppPreferences';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * 01 Splash — patrón de referencia para el resto de pantallas.
 * Layout fiel al frame de diseño: logo centrado y CTA inmediata,
 * CTA primario (rosa) + secundario (outline).
 */
type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const s = useAdaptiveStyles(baseStyles);
  const theme = useAppTheme();
  const { language, pick } = useTranslation();
  const { setLanguagePreference } = useAppPreferences();
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
          ? pick(
              'No fue posible volver a la sala. Inténtalo de nuevo en unos segundos.',
              'The room could not be restored. Try again in a few seconds.',
            )
          : pick('Esta sala ya no está disponible.', 'This room is no longer available.'),
      );
      return;
    }

    const { room, participantId } = useRoomStore.getState();
    const participant = currentParticipant(room, participantId);
    if (!participant) {
      setResumeError(pick('No fue posible recuperar tu acceso a la sala.', 'Your room access could not be restored.'));
      return;
    }

    navigation.navigate(participant.role === 'host' ? 'RoomHostPanel' : 'RoomMemberSession');
  };

  return (
    <SafeAreaView style={s.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={pick('Cambiar idioma a inglés', 'Change language to Spanish')}
        onPress={() => void setLanguagePreference(language === 'es' ? 'en' : 'es')}
        style={s.languageButton}
      >
        <Text style={s.languageLabel}>{language === 'es' ? 'EN' : 'ES'}</Text>
      </Pressable>
      <View style={s.center}>
        <Logo width={230} color={theme.colors.accent} />
        <View style={s.status}>
          <Text style={s.statusTitle}>{pick('Todo listo para conectar', 'Ready to connect')}</Text>
          <Text style={s.statusSub}>
            {pick(
              'Mantén pulsado el botón\ndel dispositivo para encenderlo',
              'Press and hold the toy button\nto turn it on',
            )}
          </Text>
        </View>
      </View>
      <View style={s.actions}>
        {savedSession ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={pick(`Volver a la sala ${savedSession.roomCode}`, `Return to room ${savedSession.roomCode}`)}
            disabled={resumingRoom}
            style={[s.resume, resumingRoom && s.resumeDisabled]}
            onPress={() => void resumeRoom()}
          >
            <Text style={s.resumeLabel}>
              {resumingRoom
                ? pick('Volviendo a tu sala…', 'Returning to your room…')
                : pick(`Volver a la sala ${savedSession.roomCode}`, `Return to room ${savedSession.roomCode}`)}
            </Text>
          </Pressable>
        ) : null}
        <Pressable style={s.primary} onPress={() => navigation.navigate('Scan')}>
          <Text style={s.primaryLabel}>{pick('Comenzar juego', 'Start playing')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pick('Continuar sin juguete y unirse a una sala', 'Continue without a toy and join a room')}
          style={s.secondary}
          onPress={() => navigation.navigate('RoomJoin')}
        >
          <Text style={s.secondaryLabel}>{pick('Continuar sin juguete', 'Continue without a toy')}</Text>
        </Pressable>
        {resumeError ? <Text style={s.resumeError}>{resumeError}</Text> : null}
        <Text style={s.version}>{pick('Versión', 'Version')} {appVersion}</Text>
      </View>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg, paddingHorizontal: spacing.xxl },
  languageButton: {
    position: 'absolute',
    zIndex: 2,
    top: spacing.lg,
    right: spacing.xxl,
    minWidth: 48,
    minHeight: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageLabel: { ...typography.label, color: palette.ink, fontWeight: '800' },
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
