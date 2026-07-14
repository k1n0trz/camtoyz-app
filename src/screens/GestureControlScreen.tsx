import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { GESTURE_THROTTLE_MS, clampIntensity, intensityFromY } from '@/features/gesture/intensity';
import type { RootStackParamList } from '@/navigation/routes';
import { useBleStore } from '@/state/bleStore';
import { palette, radii, spacing, typography } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GestureControl'>;

export default function GestureControlScreen({ navigation }: Props) {
  const connectionState = useBleStore((state) => state.connectionState);
  const commandBusy = useBleStore((state) => state.commandBusy);
  const commandError = useBleStore((state) => state.error);
  const setIntensity = useBleStore((state) => state.setIntensity);
  const stop = useBleStore((state) => state.stop);
  const connected = connectionState === 'connected';
  const [intensity, setIntensityLabel] = useState(0);
  const [frozen, setFrozen] = useState(false);
  const padHeight = useSharedValue(1);
  const cursorX = useSharedValue(0);
  const cursorY = useSharedValue(0);
  const lastSentAt = useRef(0);
  const inFlight = useRef(false);
  const pending = useRef<number>();
  const throttleTimer = useRef<ReturnType<typeof setTimeout>>();
  const gestureEnabled = useRef(false);
  const commandGeneration = useRef(0);

  const clearThrottle = useCallback(() => {
    commandGeneration.current += 1;
    if (throttleTimer.current) clearTimeout(throttleTimer.current);
    throttleTimer.current = undefined;
    pending.current = undefined;
  }, []);

  const flushIntensity = useCallback(async () => {
    throttleTimer.current = undefined;
    if (
      inFlight.current ||
      pending.current === undefined ||
      !connected ||
      frozen ||
      !gestureEnabled.current
    ) {
      return;
    }

    const next = pending.current;
    const generation = commandGeneration.current;
    pending.current = undefined;
    inFlight.current = true;
    lastSentAt.current = Date.now();
    await setIntensity(next);
    inFlight.current = false;

    if (generation !== commandGeneration.current || !gestureEnabled.current) return;

    if (pending.current !== undefined) {
      const wait = Math.max(0, GESTURE_THROTTLE_MS - (Date.now() - lastSentAt.current));
      throttleTimer.current = setTimeout(() => void flushIntensity(), wait);
    }
  }, [connected, frozen, setIntensity]);

  const queueIntensity = useCallback(
    (value: number) => {
      if (!connected || frozen || !gestureEnabled.current) return;
      const next = clampIntensity(value);
      setIntensityLabel(next);
      pending.current = next;

      if (inFlight.current || throttleTimer.current) return;
      const wait = Math.max(0, GESTURE_THROTTLE_MS - (Date.now() - lastSentAt.current));
      throttleTimer.current = setTimeout(() => void flushIntensity(), wait);
    },
    [connected, flushIntensity, frozen],
  );

  const beginGesture = useCallback(
    (value: number) => {
      if (!connected || frozen) return;
      gestureEnabled.current = true;
      queueIntensity(value);
    },
    [connected, frozen, queueIntensity],
  );

  const waitForInFlight = useCallback(async () => {
    const timeoutAt = Date.now() + 200;
    while (inFlight.current && Date.now() < timeoutAt) {
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
    }
  }, []);

  useEffect(
    () =>
      navigation.addListener('blur', () => {
        clearThrottle();
        void stop();
      }),
    [clearThrottle, navigation, stop],
  );

  useEffect(() => clearThrottle, [clearThrottle]);

  const onPadLayout = (event: LayoutChangeEvent) => {
    padHeight.value = event.nativeEvent.layout.height;
  };

  const gesture = Gesture.Pan()
    .onBegin((event) => {
      cursorX.value = event.x;
      cursorY.value = event.y;
      runOnJS(beginGesture)(intensityFromY(event.y, padHeight.value));
    })
    .onUpdate((event) => {
      cursorX.value = event.x;
      cursorY.value = event.y;
      runOnJS(queueIntensity)(intensityFromY(event.y, padHeight.value));
    });

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: connected ? 1 : 0,
    transform: [{ translateX: cursorX.value - 14 }, { translateY: cursorY.value - 14 }],
  }));

  const handleFreeze = () => {
    setFrozen((current) => {
      if (!current) {
        gestureEnabled.current = false;
        clearThrottle();
      }
      return !current;
    });
  };

  const handleStop = async () => {
    gestureEnabled.current = false;
    clearThrottle();
    setIntensityLabel(0);
    await waitForInFlight();
    await stop();
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => navigation.goBack()}>
          <Text style={s.back}>‹</Text>
        </Pressable>
        <Text style={s.title}>Control por gesto</Text>
        <View style={{ flex: 1 }} />
        <View style={s.levelBadge}>
          <Text style={s.levelNumber}>{intensity}</Text>
        </View>
      </View>

      <GestureDetector gesture={gesture}>
        <View
          accessibilityLabel="Pad de intensidad"
          accessibilityHint="Desliza hacia arriba para aumentar la intensidad"
          onLayout={onPadLayout}
          style={[s.pad, (!connected || frozen) && s.padInactive]}
        >
          <Text style={s.padHint}>
            {frozen ? 'Nivel congelado' : connected ? 'Desliza para controlar la intensidad' : 'Conecta un dispositivo para controlar'}
          </Text>
          <Animated.View style={[s.cursor, cursorStyle]} />
          <View style={s.scale}>
            <Text style={s.scaleLabel}>SUAVE</Text>
            <View style={s.scaleTrack}>
              <View style={[s.scaleFill, { width: `${intensity}%` }]} />
            </View>
            <Text style={s.scaleLabel}>FUERTE</Text>
          </View>
        </View>
      </GestureDetector>

      {commandError ? <Text style={s.error}>{commandError}</Text> : null}

      <View style={s.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={frozen ? 'Reanudar control' : 'Congelar nivel'}
          disabled={!connected || commandBusy}
          onPress={handleFreeze}
          style={[s.freezeButton, (!connected || commandBusy) && s.disabled]}
        >
          <Text style={s.freezeLabel}>{frozen ? 'Reanudar control' : 'Congelar nivel'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Detener vibración"
          disabled={!connected}
          onPress={() => void handleStop()}
          style={[s.stopButton, !connected && s.disabled]}
        >
          <Text style={s.stopLabel}>Detener</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  back: { color: palette.ink, fontSize: 28, lineHeight: 28 },
  title: { ...typography.section, color: palette.ink },
  levelBadge: { width: 52, height: 52, borderRadius: 26, borderWidth: 4, borderColor: palette.accent, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' },
  levelNumber: { ...typography.label, color: palette.ink, fontWeight: '800' },
  pad: { flex: 1, margin: spacing.xl, marginTop: spacing.sm, borderRadius: radii.sheet, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.bgAlt, overflow: 'hidden' },
  padInactive: { opacity: 0.6 },
  padHint: { ...typography.small, color: palette.textMuted, fontWeight: '600', margin: spacing.lg },
  cursor: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: palette.accent, borderWidth: 2, borderColor: palette.card },
  scale: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scaleLabel: { fontSize: 11, color: palette.textMuted, fontWeight: '700' },
  scaleTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: palette.tint },
  scaleFill: { height: '100%', borderRadius: 3, backgroundColor: palette.accent },
  error: { ...typography.small, color: palette.danger, paddingHorizontal: spacing.xl },
  footer: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  freezeButton: { flex: 1, minHeight: 54, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.borderStrong, alignItems: 'center', justifyContent: 'center' },
  freezeLabel: { ...typography.label, color: palette.ink, fontWeight: '600' },
  stopButton: { flex: 1, minHeight: 54, borderRadius: radii.lg, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  stopLabel: { ...typography.label, color: palette.ink, fontWeight: '700' },
  disabled: { opacity: 0.4 },
});
