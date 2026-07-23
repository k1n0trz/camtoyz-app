import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BackButton } from '@/components/BackButton';
import { MotorIntensityMixer } from '@/components/MotorIntensityMixer';
import { ble } from '@/ble/BleManager';
import { AdaptiveBeatDetector } from '@/features/audio/beatDetector';
import { meteringToPercent } from '@/features/audio/metering';
import {
  isPlaybackCaptureSupported,
  requestLocalTrack,
  requestPlaybackCapture,
  startLocalTrack,
  stopPlaybackCapture,
  subscribePlaybackLevel,
  subscribePlaybackStatus,
} from '@/features/audio/playbackCapture';
import type { RootStackParamList } from '@/navigation/routes';
import { goBackOr } from '@/navigation/back';
import { useBleStore } from '@/state/bleStore';
import { palette, radii, spacing, typography } from '@/theme/index';
import { useAdaptiveStyles } from '@/theme/useAdaptiveStyles';
import { useTranslation } from '@/i18n/useTranslation';

type Props = NativeStackScreenProps<RootStackParamList, 'MusicControl'>;
type AudioSource = 'app' | 'local';
interface LocalTrack { uri: string; name: string }

const BARS = [0.3, 0.55, 0.85, 0.45, 0.7, 1, 0.6, 0.35, 0.75, 0.5, 0.25];
const SILENCE_DB = -65;
const QUIET_GAP_MS = 45;

export default function MusicControlScreen({ navigation }: Props) {
  const s = useAdaptiveStyles(baseStyles);
  const { pick, error: translateError } = useTranslation();
  const connected = useBleStore((state) => state.connectionState === 'connected');
  const stop = useBleStore((state) => state.stop);
  const channelCount = useBleStore((state) => state.device?.channelCount ?? 1);
  const [source, setSource] = useState<AudioSource>('app');
  const [localTrack, setLocalTrack] = useState<LocalTrack>();
  const [level, setLevel] = useState(0);
  const [motorLevels, setMotorLevels] = useState<number[]>(() => Array(channelCount).fill(80));
  const [active, setActive] = useState(false);
  const [beatStrength, setBeatStrength] = useState(0);
  const [error, setError] = useState<string>();

  const activeRef = useRef(false);
  const motorLevelsRef = useRef(motorLevels);
  const channelCountRef = useRef(channelCount);
  const connectedRef = useRef(connected);
  const detector = useRef(new AdaptiveBeatDetector());
  const writeInFlight = useRef(false);
  const pulseTimer = useRef<ReturnType<typeof setTimeout>>();
  const motorOn = useRef(false);
  const quietUntil = useRef(0);
  const silenceFrames = useRef(0);
  const silenceStopSent = useRef(false);

  useEffect(() => {
    setMotorLevels((current) =>
      Array.from({ length: channelCount }, (_, channel) => current[channel] ?? 80),
    );
    channelCountRef.current = channelCount;
  }, [channelCount]);
  useEffect(() => { motorLevelsRef.current = motorLevels; }, [motorLevels]);
  useEffect(() => { connectedRef.current = connected; }, [connected]);

  const resetPulseState = useCallback(() => {
    motorOn.current = false;
    quietUntil.current = Date.now() + QUIET_GAP_MS;
    setBeatStrength(0);
  }, []);

  const requestMotorStop = useCallback(async (global = false): Promise<void> => {
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    pulseTimer.current = undefined;
    try {
      if (global) await stop();
      else await ble.setIntensities(Array(channelCountRef.current).fill(0));
    } finally {
      writeInFlight.current = false;
      resetPulseState();
    }
  }, [resetPulseState, stop]);

  const stopEverything = useCallback(async () => {
    activeRef.current = false;
    setActive(false);
    silenceFrames.current = 0;
    silenceStopSent.current = true;
    detector.current.reset();
    stopPlaybackCapture();
    await requestMotorStop(true);
  }, [requestMotorStop]);

  useEffect(() => {
    const levels = subscribePlaybackLevel((sample) => {
      const now = Date.now();
      setLevel(meteringToPercent(sample.db));
      if (!activeRef.current || !connectedRef.current) return;
      const beat = detector.current.process(sample, 100, now);

      if (sample.db < SILENCE_DB) {
        silenceFrames.current += 1;
        if (silenceFrames.current >= 2 && !silenceStopSent.current) {
          silenceStopSent.current = true;
          void requestMotorStop();
        }
        return;
      }

      silenceFrames.current = 0;
      silenceStopSent.current = false;
      if (motorOn.current || writeInFlight.current || now < quietUntil.current) return;

      if (!beat || beat.intensity <= 0) return;
      writeInFlight.current = true;
      setBeatStrength(beat.strength);
      const outputs = motorLevelsRef.current.map(
        (maximum) => Math.round((beat.intensity * maximum) / 100),
      );
      void ble.setIntensities(outputs).then(() => {
        if (!activeRef.current) return requestMotorStop(true);
        motorOn.current = true;
        pulseTimer.current = setTimeout(() => {
          void requestMotorStop();
        }, beat.durationMs);
      }).catch(() => {
        setError(pick('No fue posible enviar el pulso al dispositivo.', 'The pulse could not be sent to the device.'));
        return requestMotorStop(true);
      }).finally(() => {
        writeInFlight.current = false;
      });
    });

    const states = subscribePlaybackStatus(({ status, message, trackUri, trackName }) => {
      if (status === 'selected' && trackUri) {
        setLocalTrack({ uri: trackUri, name: trackName ?? pick('Canción seleccionada', 'Selected song') });
        setError(undefined);
      }
      if (status === 'active') {
        detector.current.reset();
        silenceFrames.current = 0;
        silenceStopSent.current = false;
        activeRef.current = true;
        setActive(true);
      }
      if (status === 'completed' || status === 'stopped') {
        activeRef.current = false;
        setActive(false);
        void requestMotorStop();
      }
      if (status === 'denied') setError(pick('Android no autorizó la captura de audio interno.', 'Android did not allow internal audio capture.'));
      if (status === 'error') {
        activeRef.current = false;
        setActive(false);
        setError(message ?? pick('No fue posible iniciar el control musical.', 'Music control could not be started.'));
        void requestMotorStop();
      }
      if (status === 'unsupported' || status === 'unavailable') {
        setError(pick('La captura musical no está disponible en esta instalación.', 'Music capture is not available in this build.'));
      }
    });
    return () => { levels.remove(); states.remove(); void stopEverything(); };
  }, [pick, requestMotorStop, stopEverything]);

  useEffect(() => navigation.addListener('blur', () => void stopEverything()), [navigation, stopEverything]);

  const chooseSource = (next: AudioSource) => {
    if (next === source) return;
    void stopEverything();
    setSource(next);
    setError(undefined);
    setLevel(0);
  };

  const toggle = () => {
    if (active) { void stopEverything(); return; }
    if (!connected) { setError(pick('Conecta el juguete antes de activar el ritmo.', 'Connect the toy before enabling rhythm control.')); return; }
    if (!isPlaybackCaptureSupported()) {
      setError(pick('Esta instalación necesita reconstruirse para usar el control musical.', 'This build must be rebuilt to use music control.'));
      return;
    }
    setError(undefined);
    if (source === 'local') {
      if (!localTrack) requestLocalTrack();
      else startLocalTrack(localTrack.uri);
      return;
    }
    requestPlaybackCapture();
  };

  const actionLabel = active
    ? pick('Detener', 'Stop')
    : source === 'local'
      ? localTrack ? pick('Reproducir con ritmo', 'Play with rhythm') : pick('Elegir canción', 'Choose song')
      : pick('Activar ritmo musical', 'Enable music rhythm');

  return <SafeAreaView style={s.root} edges={['top']}>
    <View style={s.header}>
      <BackButton onPress={() => goBackOr(navigation, 'Dashboard')} />
      <Text style={s.title}>{pick('Control musical', 'Music control')}</Text>
    </View>
    <ScrollView contentContainerStyle={s.content}>
      <View>
        <Text style={s.sectionTitle}>{pick('Fuente de música', 'Music source')}</Text>
        <View style={s.sourceOptions}>
          <Pressable style={[s.sourceOption, source === 'app' && s.sourceSelected]} onPress={() => chooseSource('app')}>
            <Text style={s.sourceIcon}>◉</Text><Text style={s.sourceName}>{pick('Otra app', 'Another app')}</Text>
            <Text style={s.sourceHint}>Spotify, YouTube Music…</Text>
          </Pressable>
          <Pressable style={[s.sourceOption, source === 'local' && s.sourceSelected]} onPress={() => chooseSource('local')}>
            <Text style={s.sourceIcon}>♫</Text><Text style={s.sourceName}>{pick('Mi dispositivo', 'My device')}</Text>
            <Text style={s.sourceHint}>{pick('Archivos de audio guardados', 'Saved audio files')}</Text>
          </Pressable>
        </View>
      </View>

      {source === 'local' ? <Pressable style={s.trackCard} onPress={requestLocalTrack}>
        <View style={s.art}><Text style={s.artText}>♫</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>{localTrack?.name ?? pick('Seleccionar una canción', 'Select a song')}</Text>
          <Text style={s.sub}>{localTrack ? pick('Toca para cambiar el archivo', 'Tap to change the file') : pick('MP3, M4A y otros formatos compatibles', 'MP3, M4A, and other supported formats')}</Text>
        </View>
        <Text style={s.chevron}>›</Text>
      </Pressable> : <View style={s.trackCard}>
        <View style={s.art}><Text style={s.artText}>audio</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>{pick('Audio interno de otra app', 'Internal audio from another app')}</Text>
          <Text style={s.sub}>{active ? pick('Capturando ritmo y graves', 'Capturing rhythm and bass') : pick('Android te pedirá elegir la app de música', 'Android will ask you to choose the music app')}</Text>
        </View>
      </View>}

      <View style={s.visual}>
        <View style={s.bars}>{BARS.map((base, index) => <View
          key={index}
          style={[s.bar, {
            height: `${Math.max(12, base * (35 + level * 0.65))}%`,
            opacity: beatStrength > 0 ? 1 : 0.45,
          }]}
        />)}</View>
      </View>

      <View>
        <View style={s.row}>
          <View>
            <Text style={s.label}>{pick('Fuerza por motor', 'Strength per motor')}</Text>
            <Text style={s.sub}>{pick('Cada motor conserva su propio nivel.', 'Each motor keeps its own level.')}</Text>
          </View>
        </View>
        <MotorIntensityMixer
          channelCount={channelCount}
          values={motorLevels}
          onChange={(channel, value) => {
            setMotorLevels((current) => current.map((level, index) => index === channel ? value : level));
          }}
        />
        <View style={s.scale}><Text style={s.scaleText}>{pick('Suave', 'Low')}</Text><Text style={s.scaleText}>{pick('Intenso', 'High')}</Text></View>
      </View>

      <Text style={s.privacy}>{source === 'app'
        ? pick('Android pedirá permiso para capturar el audio de la app que elijas. No guardamos ni enviamos el audio.', 'Android will request permission to capture audio from the selected app. Audio is never stored or sent.')
        : pick('La canción se reproduce y analiza únicamente en este teléfono. No guardamos ni enviamos el audio.', 'The song is played and analyzed only on this phone. Audio is never stored or sent.')}</Text>
      {error ? <Text style={s.error}>{translateError(error)}</Text> : null}
    </ScrollView>
    <View style={s.footer}>
      <Pressable style={[s.button, active && s.stopButton]} onPress={toggle}>
        <Text style={s.buttonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  </SafeAreaView>;
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  header: { height: 56, paddingHorizontal: spacing.xl, alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  back: { fontSize: 28, color: palette.ink },
  title: { ...typography.section, color: palette.ink },
  content: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xl },
  sectionTitle: { ...typography.label, color: palette.ink, marginBottom: spacing.md },
  sourceOptions: { flexDirection: 'row', gap: spacing.sm },
  sourceOption: { flex: 1, minHeight: 112, padding: spacing.md, borderRadius: radii.card, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card },
  sourceSelected: { borderColor: palette.accent, borderWidth: 2, backgroundColor: palette.tint },
  sourceIcon: { fontSize: 22, color: palette.accent, marginBottom: spacing.xs },
  sourceName: { ...typography.label, color: palette.ink },
  sourceHint: { ...typography.small, color: palette.textSecondary, marginTop: 3 },
  trackCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1, borderRadius: radii.card },
  art: { width: 52, height: 52, borderRadius: radii.md, backgroundColor: palette.tint, alignItems: 'center', justifyContent: 'center' },
  artText: { ...typography.small, color: palette.textMuted },
  chevron: { fontSize: 28, color: palette.textMuted },
  label: { ...typography.label, color: palette.ink },
  sub: { ...typography.small, color: palette.textSecondary, marginTop: 2 },
  visual: { height: 180, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1, borderRadius: radii.cardLg },
  bars: { width: '100%', height: 115, alignItems: 'flex-end', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  bar: { width: 9, borderRadius: 4, backgroundColor: palette.accent },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  max: { ...typography.section, color: palette.accent },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleText: { ...typography.small, color: palette.textMuted },
  privacy: { ...typography.small, color: palette.textMuted, lineHeight: 18 },
  error: { ...typography.small, color: palette.danger },
  footer: { padding: spacing.xl, borderTopWidth: 1, borderColor: palette.border, backgroundColor: palette.bg },
  button: { minHeight: 54, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.primary, borderRadius: radii.lg },
  stopButton: { backgroundColor: palette.tint },
  buttonText: { ...typography.label, color: palette.ink, fontWeight: '700' },
});
