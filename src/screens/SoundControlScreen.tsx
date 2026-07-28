import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';

import { meteringToPercent, soundToIntensity } from '@/features/audio/metering';
import { BackButton } from '@/components/BackButton';
import { MotorIntensityMixer } from '@/components/MotorIntensityMixer';
import { goBackOr } from '@/navigation/back';
import type { RootStackParamList } from '@/navigation/routes';
import { useBleStore } from '@/state/bleStore';
import { palette, radii, spacing, typography } from '@/theme/index';
import { useAdaptiveStyles } from '@/theme/useAdaptiveStyles';
import { useTranslation } from '@/i18n/useTranslation';

type Props = NativeStackScreenProps<RootStackParamList, 'SoundControl'>;

const RECORDER_OPTIONS = {
  ...Audio.RecordingOptionsPresets.LOW_QUALITY,
  isMeteringEnabled: true,
};

const RELEASE_DELAY_MS = 700;

export default function SoundControlScreen({ navigation }: Props) {
  const s = useAdaptiveStyles(baseStyles);
  const { pick, error: translateError } = useTranslation();
  const connectionState = useBleStore((state) => state.connectionState);
  const setIntensities = useBleStore((state) => state.setIntensities);
  const stop = useBleStore((state) => state.stop);
  const channelCount = useBleStore((state) => state.device?.channelCount ?? 1);
  const connected = connectionState === 'connected';
  const [sensitivity, setSensitivity] = useState(65);
  const [motorLevels, setMotorLevels] = useState<number[]>(() => Array(channelCount).fill(80));
  const [listening, setListening] = useState(false);
  const [responding, setResponding] = useState(false);
  const [metering, setMetering] = useState<number>();
  const [error, setError] = useState<string>();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const respondingRef = useRef(false);
  const lastSentAt = useRef(0);
  const lastIntensities = useRef<number[]>(Array(channelCount).fill(0));
  const sending = useRef(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearReleaseTimer = useCallback(() => {
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = undefined;
  }, []);

  useEffect(() => {
    setMotorLevels((current) =>
      Array.from({ length: channelCount }, (_, channel) => current[channel] ?? 80),
    );
    lastIntensities.current = Array(channelCount).fill(0);
  }, [channelCount]);

  const scheduleRelease = useCallback(() => {
    clearReleaseTimer();
    const release = () => {
      if (!respondingRef.current || !lastIntensities.current.some((value) => value > 0)) return;
      if (sending.current) {
        releaseTimer.current = setTimeout(release, 50);
        return;
      }
      lastIntensities.current = Array(channelCount).fill(0);
      sending.current = true;
      void stop().finally(() => {
        sending.current = false;
      });
    };
    releaseTimer.current = setTimeout(release, RELEASE_DELAY_MS);
  }, [channelCount, clearReleaseTimer, stop]);

  const stopAudio = useCallback(async () => {
    respondingRef.current = false;
    setResponding(false);
    lastIntensities.current = Array(channelCount).fill(0);
    clearReleaseTimer();
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (recording) await recording.stopAndUnloadAsync().catch(() => undefined);
    setMetering(undefined);
    setListening(false);
  }, [channelCount, clearReleaseTimer]);

  const stopEverything = useCallback(async () => {
    await stopAudio();
    await stop();
  }, [stop, stopAudio]);

  useEffect(
    () =>
      navigation.addListener('blur', () => {
        void stopEverything();
      }),
    [navigation, stopEverything],
  );

  useEffect(() => () => void stopAudio(), [stopAudio]);

  const startListening = async (): Promise<boolean> => {
    setError(undefined);
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      setError(pick('Necesitamos permiso de micrófono para medir el sonido.', 'Microphone permission is required to measure sound.'));
      return false;
    }
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      const recording = new Audio.Recording();
      recording.setProgressUpdateInterval(100);
      recording.setOnRecordingStatusUpdate((status) => setMetering(status.isRecording ? status.metering : undefined));
      await recording.prepareToRecordAsync(RECORDER_OPTIONS);
      await recording.startAsync();
      recordingRef.current = recording;
      setListening(true);
      return true;
    } catch {
      setError(pick('No fue posible iniciar el medidor de sonido.', 'The sound meter could not be started.'));
      return false;
    }
  };

  const level = meteringToPercent(metering);
  const targetIntensity = soundToIntensity(level, sensitivity);
  const targetIntensities = useMemo(
    () => motorLevels.map((maximum) => Math.round((targetIntensity * maximum) / 100)),
    [motorLevels, targetIntensity],
  );

  useEffect(() => {
    if (!responding || !respondingRef.current || !connected || sending.current) return;
    if (targetIntensity === 0) return;
    scheduleRelease();
    const now = Date.now();
    if (now - lastSentAt.current < 100) return;
    if (targetIntensities.every(
      (value, channel) => Math.abs(value - (lastIntensities.current[channel] ?? 0)) < 2,
    )) return;
    sending.current = true;
    lastSentAt.current = now;
    lastIntensities.current = targetIntensities;
    void setIntensities(targetIntensities).finally(() => {
      sending.current = false;
    });
  }, [connected, responding, scheduleRelease, setIntensities, targetIntensities, targetIntensity]);

  const toggleResponse = async () => {
    if (responding) {
      await stopEverything();
      return;
    }
    if (!connected) {
      setError(pick('Conecta un dispositivo antes de activar la respuesta.', 'Connect a device before enabling sound response.'));
      return;
    }
    if (!listening && !(await startListening())) return;
    respondingRef.current = true;
    setResponding(true);
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <BackButton onPress={() => goBackOr(navigation, 'Dashboard')} />
        <Text style={s.title}>{pick('Control por sonido', 'Sound control')}</Text>
      </View>
      <View style={s.content}>
        <View style={s.meterCard}>
          <Text style={s.meterValue}>{level}</Text>
          <Text style={s.meterLabel}>{listening ? pick('Nivel de sonido', 'Sound level') : pick('Micrófono inactivo', 'Microphone inactive')}</Text>
          <View style={s.meterTrack}><View style={[s.meterFill, { width: `${level}%` }]} /></View>
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>{pick('Sensibilidad', 'Sensitivity')}</Text>
          <Text style={s.sectionText}>{pick('Los sonidos más suaves activan una sensibilidad más alta.', 'Higher sensitivity reacts to softer sounds.')}</Text>
          <View style={s.options}>
            {[35, 65, 90].map((value) => (
              <Pressable key={value} onPress={() => setSensitivity(value)} style={[s.option, sensitivity === value && s.optionActive]}>
                <Text style={[s.optionLabel, sensitivity === value && s.optionLabelActive]}>
                  {value === 35 ? pick('Suave', 'Low') : value === 65 ? pick('Media', 'Medium') : pick('Alta', 'High')}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={s.previewCard}>
          <Text style={s.previewTitle}>{pick('Respuesta prevista', 'Expected response')}</Text>
          <Text style={s.previewValue}>
            {targetIntensities.map((value, channel) => `M${channel + 1} ${value}%`).join(' · ')}
          </Text>
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>{pick('Fuerza máxima por motor', 'Maximum strength per motor')}</Text>
          <Text style={s.sectionText}>{pick('Cada motor reaccionará al mismo sonido con su propio nivel.', 'Each motor reacts to the same sound at its own level.')}</Text>
          <MotorIntensityMixer
            channelCount={channelCount}
            values={motorLevels}
            onChange={(channel, value) => {
              setMotorLevels((current) => current.map((level, index) => index === channel ? value : level));
            }}
          />
        </View>
        <Text style={s.privacy}>{pick('El nivel se procesa localmente. El audio no se envía a ningún servidor.', 'The level is processed locally. Audio is never sent to a server.')}</Text>
        {error ? <Text style={s.error}>{translateError(error)}</Text> : null}
      </View>
      <View style={s.footer}>
        <Pressable onPress={() => void toggleResponse()} style={[s.primaryButton, responding && s.stopButton]}>
          <Text style={s.primaryLabel}>{responding ? pick('Detener', 'Stop') : pick('Activar control por sonido', 'Enable sound control')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg }, header: { height: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl }, back: { color: palette.ink, fontSize: 28 }, title: { ...typography.section, color: palette.ink }, content: { flex: 1, padding: spacing.xl, gap: spacing.xl }, meterCard: { alignItems: 'center', backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: radii.cardLg, padding: spacing.xxl, gap: spacing.sm }, meterValue: { fontSize: 52, fontWeight: '800', color: palette.ink }, meterLabel: { ...typography.small, color: palette.textSecondary }, meterTrack: { width: '100%', height: 8, backgroundColor: palette.tint, borderRadius: radii.pill, overflow: 'hidden', marginTop: spacing.md }, meterFill: { height: '100%', backgroundColor: palette.accent, borderRadius: radii.pill }, section: { gap: spacing.sm }, sectionTitle: { ...typography.label, color: palette.ink, fontWeight: '700' }, sectionText: { ...typography.small, color: palette.textSecondary }, options: { flexDirection: 'row', gap: spacing.sm }, option: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, borderWidth: 1, borderColor: palette.borderStrong, backgroundColor: palette.card }, optionActive: { borderColor: palette.accent, borderWidth: 1.5 }, optionLabel: { ...typography.small, color: palette.textSecondary, fontWeight: '600' }, optionLabelActive: { color: palette.accent }, previewCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: palette.tint2, borderRadius: radii.card, padding: spacing.lg }, previewTitle: { ...typography.label, color: palette.ink }, previewValue: { fontSize: 24, fontWeight: '800', color: palette.accent }, privacy: { ...typography.small, color: palette.textMuted, lineHeight: 18 }, error: { ...typography.small, color: palette.danger }, footer: { padding: spacing.xl, borderTopWidth: 1, borderColor: palette.border }, primaryButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, backgroundColor: palette.primary }, stopButton: { backgroundColor: palette.tint }, primaryLabel: { ...typography.label, color: palette.ink, fontWeight: '700' },
});
