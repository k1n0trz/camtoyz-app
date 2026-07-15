import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import IntensitySlider from '@/components/IntensitySlider';
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
import { useBleStore } from '@/state/bleStore';
import { palette, radii, spacing, typography } from '@/theme/index';

type Props = NativeStackScreenProps<RootStackParamList, 'MusicControl'>;
type AudioSource = 'app' | 'local';
interface LocalTrack { uri: string; name: string }

const BARS = [0.3, 0.55, 0.85, 0.45, 0.7, 1, 0.6, 0.35, 0.75, 0.5, 0.25];
const SILENCE_DB = -65;
const QUIET_GAP_MS = 180;

export default function MusicControlScreen({ navigation }: Props) {
  const connected = useBleStore((state) => state.connectionState === 'connected');
  const setIntensity = useBleStore((state) => state.setIntensity);
  const stop = useBleStore((state) => state.stop);
  const [source, setSource] = useState<AudioSource>('app');
  const [localTrack, setLocalTrack] = useState<LocalTrack>();
  const [level, setLevel] = useState(0);
  const [maximum, setMaximum] = useState(80);
  const [active, setActive] = useState(false);
  const [beatStrength, setBeatStrength] = useState(0);
  const [beatCount, setBeatCount] = useState(0);
  const [error, setError] = useState<string>();

  const activeRef = useRef(false);
  const maximumRef = useRef(maximum);
  const connectedRef = useRef(connected);
  const detector = useRef(new AdaptiveBeatDetector());
  const commandChain = useRef<Promise<void>>(Promise.resolve());
  const commandPending = useRef(false);
  const stopQueued = useRef(false);
  const motorOn = useRef(false);
  const pulseEndsAt = useRef(0);
  const quietUntil = useRef(0);
  const silenceFrames = useRef(0);
  const silenceStopSent = useRef(false);

  useEffect(() => { maximumRef.current = maximum; }, [maximum]);
  useEffect(() => { connectedRef.current = connected; }, [connected]);

  const enqueueCommand = useCallback((operation: () => Promise<void>): Promise<void> => {
    const task = commandChain.current.then(operation, operation);
    commandChain.current = task.catch(() => undefined);
    return task;
  }, []);

  const resetPulseState = useCallback(() => {
    motorOn.current = false;
    pulseEndsAt.current = 0;
    quietUntil.current = Date.now() + QUIET_GAP_MS;
    setBeatStrength(0);
  }, []);

  const requestMotorStop = useCallback((): Promise<void> => {
    if (stopQueued.current) return commandChain.current;
    stopQueued.current = true;
    const task = enqueueCommand(async () => {
      await stop();
      resetPulseState();
    });
    return task.catch(() => undefined).finally(() => {
      stopQueued.current = false;
      commandPending.current = false;
    });
  }, [enqueueCommand, resetPulseState, stop]);

  const stopEverything = useCallback(async () => {
    activeRef.current = false;
    setActive(false);
    silenceFrames.current = 0;
    silenceStopSent.current = true;
    detector.current.reset();
    stopPlaybackCapture();
    await requestMotorStop();
  }, [requestMotorStop]);

  useEffect(() => {
    const levels = subscribePlaybackLevel((sample) => {
      const now = Date.now();
      setLevel(meteringToPercent(sample.db));
      if (!activeRef.current || !connectedRef.current) return;
      const beat = detector.current.process(sample, maximumRef.current, now);

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
      if (motorOn.current) {
        if (now >= pulseEndsAt.current) void requestMotorStop();
        return;
      }
      if (commandPending.current || stopQueued.current || now < quietUntil.current) return;

      if (!beat || beat.intensity <= 0) return;
      commandPending.current = true;
      setBeatStrength(beat.strength);
      setBeatCount((count) => count + 1);
      void enqueueCommand(async () => {
        const started = await setIntensity(beat.intensity);
        if (!started || !activeRef.current) {
          await stop();
          resetPulseState();
          return;
        }
        motorOn.current = true;
        pulseEndsAt.current = Date.now() + beat.durationMs;
      }).catch(() => requestMotorStop()).finally(() => {
        commandPending.current = false;
      });
    });

    const states = subscribePlaybackStatus(({ status, message, trackUri, trackName }) => {
      if (status === 'selected' && trackUri) {
        setLocalTrack({ uri: trackUri, name: trackName ?? 'Canción seleccionada' });
        setError(undefined);
      }
      if (status === 'active') {
        detector.current.reset();
        silenceFrames.current = 0;
        silenceStopSent.current = false;
        setBeatCount(0);
        activeRef.current = true;
        setActive(true);
      }
      if (status === 'completed' || status === 'stopped') {
        activeRef.current = false;
        setActive(false);
        void requestMotorStop();
      }
      if (status === 'denied') setError('Android no autorizó la captura de audio interno.');
      if (status === 'error') {
        activeRef.current = false;
        setActive(false);
        setError(message ?? 'No fue posible iniciar el control musical.');
        void requestMotorStop();
      }
      if (status === 'unsupported' || status === 'unavailable') {
        setError('La captura musical no está disponible en esta instalación.');
      }
    });
    return () => { levels.remove(); states.remove(); void stopEverything(); };
  }, [enqueueCommand, requestMotorStop, resetPulseState, setIntensity, stop, stopEverything]);

  useEffect(() => navigation.addListener('blur', () => void stopEverything()), [navigation, stopEverything]);

  const chooseSource = (next: AudioSource) => {
    if (next === source) return;
    void stopEverything();
    setSource(next);
    setError(undefined);
    setLevel(0);
    setBeatCount(0);
  };

  const toggle = () => {
    if (active) { void stopEverything(); return; }
    if (!connected) { setError('Conecta la bala antes de activar el ritmo.'); return; }
    if (!isPlaybackCaptureSupported()) {
      setError('Esta instalación necesita reconstruirse para usar el control musical.');
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
    ? 'Detener'
    : source === 'local'
      ? localTrack ? 'Reproducir con ritmo' : 'Elegir canción'
      : 'Activar ritmo musical';

  return <SafeAreaView style={s.root} edges={['top']}>
    <View style={s.header}>
      <Pressable onPress={() => navigation.goBack()}><Text style={s.back}>‹</Text></Pressable>
      <Text style={s.title}>Control musical</Text>
    </View>
    <ScrollView contentContainerStyle={s.content}>
      <View>
        <Text style={s.sectionTitle}>Fuente de música</Text>
        <View style={s.sourceOptions}>
          <Pressable style={[s.sourceOption, source === 'app' && s.sourceSelected]} onPress={() => chooseSource('app')}>
            <Text style={s.sourceIcon}>◉</Text><Text style={s.sourceName}>Otra app</Text>
            <Text style={s.sourceHint}>Spotify, YouTube Music…</Text>
          </Pressable>
          <Pressable style={[s.sourceOption, source === 'local' && s.sourceSelected]} onPress={() => chooseSource('local')}>
            <Text style={s.sourceIcon}>♫</Text><Text style={s.sourceName}>Mi dispositivo</Text>
            <Text style={s.sourceHint}>Archivos de audio guardados</Text>
          </Pressable>
        </View>
      </View>

      {source === 'local' ? <Pressable style={s.trackCard} onPress={requestLocalTrack}>
        <View style={s.art}><Text style={s.artText}>♫</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>{localTrack?.name ?? 'Seleccionar una canción'}</Text>
          <Text style={s.sub}>{localTrack ? 'Toca para cambiar el archivo' : 'MP3, M4A y otros formatos compatibles'}</Text>
        </View>
        <Text style={s.chevron}>›</Text>
      </Pressable> : <View style={s.trackCard}>
        <View style={s.art}><Text style={s.artText}>audio</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Audio interno de otra app</Text>
          <Text style={s.sub}>{active ? 'Capturando ritmo y graves' : 'Android te pedirá elegir la app de música'}</Text>
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
        <Text style={s.sub}>{active ? `Ritmo: ${beatCount} golpes · pulso ${beatStrength}%` : 'Cada golpe tendrá encendido y pausa separados'}</Text>
      </View>

      <View>
        <View style={s.row}><Text style={s.label}>Nivel de vibración</Text><Text style={s.max}>{maximum}%</Text></View>
        <IntensitySlider value={maximum} onChange={setMaximum} />
        <View style={s.scale}><Text style={s.scaleText}>Suave</Text><Text style={s.scaleText}>Intenso</Text></View>
      </View>

      <Text style={s.privacy}>{source === 'app'
        ? 'Android pedirá permiso para capturar el audio de la app que elijas. No guardamos ni enviamos el audio.'
        : 'La canción se reproduce y analiza únicamente en este teléfono. No guardamos ni enviamos el audio.'}</Text>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </ScrollView>
    <View style={s.footer}>
      <Pressable style={[s.button, active && s.stopButton]} onPress={toggle}>
        <Text style={s.buttonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  </SafeAreaView>;
}

const s = StyleSheet.create({
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
  visual: { height: 210, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1, borderRadius: radii.cardLg },
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
