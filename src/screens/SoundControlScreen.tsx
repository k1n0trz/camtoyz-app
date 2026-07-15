import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';

import { meteringToPercent, soundToIntensity } from '@/features/audio/metering';
import type { RootStackParamList } from '@/navigation/routes';
import { useBleStore } from '@/state/bleStore';
import { palette, radii, spacing, typography } from '@/theme/index';

type Props = NativeStackScreenProps<RootStackParamList, 'SoundControl'>;

const RECORDER_OPTIONS = {
  ...Audio.RecordingOptionsPresets.LOW_QUALITY,
  isMeteringEnabled: true,
};

const RELEASE_DELAY_MS = 700;

export default function SoundControlScreen({ navigation }: Props) {
  const connectionState = useBleStore((state) => state.connectionState);
  const setIntensity = useBleStore((state) => state.setIntensity);
  const stop = useBleStore((state) => state.stop);
  const connected = connectionState === 'connected';
  const [sensitivity, setSensitivity] = useState(65);
  const [listening, setListening] = useState(false);
  const [responding, setResponding] = useState(false);
  const [metering, setMetering] = useState<number>();
  const [error, setError] = useState<string>();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const respondingRef = useRef(false);
  const lastSentAt = useRef(0);
  const lastIntensity = useRef(0);
  const sending = useRef(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout>>();

  const clearReleaseTimer = useCallback(() => {
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = undefined;
  }, []);

  const scheduleRelease = useCallback(() => {
    clearReleaseTimer();
    const release = () => {
      if (!respondingRef.current || lastIntensity.current === 0) return;
      if (sending.current) {
        releaseTimer.current = setTimeout(release, 50);
        return;
      }
      lastIntensity.current = 0;
      sending.current = true;
      void stop().finally(() => {
        sending.current = false;
      });
    };
    releaseTimer.current = setTimeout(release, RELEASE_DELAY_MS);
  }, [clearReleaseTimer, stop]);

  const stopAudio = useCallback(async () => {
    respondingRef.current = false;
    setResponding(false);
    lastIntensity.current = 0;
    clearReleaseTimer();
    const recording = recordingRef.current;
    recordingRef.current = null;
    if (recording) await recording.stopAndUnloadAsync().catch(() => undefined);
    setMetering(undefined);
    setListening(false);
  }, [clearReleaseTimer]);

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
      setError('Necesitamos permiso de micrófono para medir el sonido.');
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
      setError('No fue posible iniciar el medidor de sonido.');
      return false;
    }
  };

  const level = meteringToPercent(metering);
  const targetIntensity = soundToIntensity(level, sensitivity);

  useEffect(() => {
    if (!responding || !respondingRef.current || !connected || sending.current) return;
    if (targetIntensity === 0) return;
    scheduleRelease();
    const now = Date.now();
    if (now - lastSentAt.current < 100) return;
    if (Math.abs(targetIntensity - lastIntensity.current) < 2) return;
    sending.current = true;
    lastSentAt.current = now;
    lastIntensity.current = targetIntensity;
    void setIntensity(targetIntensity).finally(() => {
      sending.current = false;
    });
  }, [connected, responding, scheduleRelease, setIntensity, targetIntensity]);

  const toggleResponse = async () => {
    if (responding) {
      await stopEverything();
      return;
    }
    if (!connected) {
      setError('Conecta un dispositivo antes de activar la respuesta.');
      return;
    }
    if (!listening && !(await startListening())) return;
    respondingRef.current = true;
    setResponding(true);
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => navigation.goBack()}>
          <Text style={s.back}>‹</Text>
        </Pressable>
        <Text style={s.title}>Control por sonido</Text>
      </View>
      <View style={s.content}>
        <View style={s.meterCard}>
          <Text style={s.meterValue}>{level}</Text>
          <Text style={s.meterLabel}>{listening ? 'Nivel de sonido' : 'Micrófono inactivo'}</Text>
          <View style={s.meterTrack}><View style={[s.meterFill, { width: `${level}%` }]} /></View>
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Sensibilidad</Text>
          <Text style={s.sectionText}>Los sonidos más suaves activan una sensibilidad más alta.</Text>
          <View style={s.options}>
            {[35, 65, 90].map((value) => (
              <Pressable key={value} onPress={() => setSensitivity(value)} style={[s.option, sensitivity === value && s.optionActive]}>
                <Text style={[s.optionLabel, sensitivity === value && s.optionLabelActive]}>{value === 35 ? 'Suave' : value === 65 ? 'Media' : 'Alta'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={s.previewCard}>
          <Text style={s.previewTitle}>Respuesta prevista</Text>
          <Text style={s.previewValue}>{targetIntensity}%</Text>
        </View>
        <Text style={s.privacy}>El nivel se procesa localmente. El audio no se envía a ningún servidor.</Text>
        {error ? <Text style={s.error}>{error}</Text> : null}
      </View>
      <View style={s.footer}>
        <Pressable onPress={() => void toggleResponse()} style={[s.primaryButton, responding && s.stopButton]}>
          <Text style={s.primaryLabel}>{responding ? 'Detener' : 'Activar control por sonido'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg }, header: { height: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl }, back: { color: palette.ink, fontSize: 28 }, title: { ...typography.section, color: palette.ink }, content: { flex: 1, padding: spacing.xl, gap: spacing.xl }, meterCard: { alignItems: 'center', backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: radii.cardLg, padding: spacing.xxl, gap: spacing.sm }, meterValue: { fontSize: 52, fontWeight: '800', color: palette.ink }, meterLabel: { ...typography.small, color: palette.textSecondary }, meterTrack: { width: '100%', height: 8, backgroundColor: palette.tint, borderRadius: radii.pill, overflow: 'hidden', marginTop: spacing.md }, meterFill: { height: '100%', backgroundColor: palette.accent, borderRadius: radii.pill }, section: { gap: spacing.sm }, sectionTitle: { ...typography.label, color: palette.ink, fontWeight: '700' }, sectionText: { ...typography.small, color: palette.textSecondary }, options: { flexDirection: 'row', gap: spacing.sm }, option: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, borderWidth: 1, borderColor: palette.borderStrong, backgroundColor: palette.card }, optionActive: { borderColor: palette.accent, borderWidth: 1.5 }, optionLabel: { ...typography.small, color: palette.textSecondary, fontWeight: '600' }, optionLabelActive: { color: palette.accent }, previewCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: palette.tint2, borderRadius: radii.card, padding: spacing.lg }, previewTitle: { ...typography.label, color: palette.ink }, previewValue: { fontSize: 24, fontWeight: '800', color: palette.accent }, privacy: { ...typography.small, color: palette.textMuted, lineHeight: 18 }, error: { ...typography.small, color: palette.danger }, footer: { padding: spacing.xl, borderTopWidth: 1, borderColor: palette.border }, primaryButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, backgroundColor: palette.primary }, stopButton: { backgroundColor: palette.tint }, primaryLabel: { ...typography.label, color: palette.ink, fontWeight: '700' },
});
