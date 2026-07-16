import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { useTranslation } from '@/i18n/useTranslation';
import { useAppTheme } from '@/preferences/AppPreferences';

interface Props {
  value: number;
  onChange: (value: number) => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  compact?: boolean;
  inverted?: boolean;
}

export default function IntensitySlider({
  value,
  onChange,
  accessibilityLabel,
  disabled = false,
  compact = false,
  inverted = false,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const width = useRef(1);
  const [trackWidth, setTrackWidth] = useState(1);

  const update = useCallback((event: GestureResponderEvent) => {
    if (disabled) return;
    const percent = Math.round(Math.max(0, Math.min(1, event.nativeEvent.locationX / width.current)) * 100);
    onChange(percent);
  }, [disabled, onChange]);

  const thumbLeft = Math.max(0, Math.min(trackWidth - THUMB_SIZE, (trackWidth * value) / 100 - THUMB_SIZE / 2));

  return <View
    accessible
    accessibilityLabel={accessibilityLabel ?? t('room.intensity')}
    accessibilityRole="adjustable"
    accessibilityState={{ disabled }}
    accessibilityValue={{ min: 0, max: 100, now: value, text: `${value}%` }}
    accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
    onAccessibilityAction={({ nativeEvent }) => {
      if (disabled) return;
      if (nativeEvent.actionName === 'increment') onChange(Math.min(100, value + 5));
      if (nativeEvent.actionName === 'decrement') onChange(Math.max(0, value - 5));
    }}
    onLayout={({ nativeEvent }) => {
      const measured = Math.max(1, nativeEvent.layout.width);
      width.current = measured;
      setTrackWidth(measured);
    }}
    onStartShouldSetResponder={() => !disabled}
    onMoveShouldSetResponder={() => !disabled}
    onResponderGrant={update}
    onResponderMove={update}
    onResponderTerminationRequest={() => false}
    style={[s.touchArea, compact && s.compactTouchArea, disabled && s.disabled]}
  >
    <View
      pointerEvents="none"
      style={[s.track, { backgroundColor: inverted ? 'rgba(255,255,255,.28)' : theme.colors.border }]}
    >
      <View style={[s.fill, { width: (trackWidth * value) / 100, backgroundColor: theme.colors.accent }]} />
      <View style={[s.thumb, {
        left: thumbLeft,
        backgroundColor: theme.colors.primary,
        borderColor: inverted ? '#FFFFFF' : theme.colors.card,
      }]} />
    </View>
  </View>;
}

const THUMB_SIZE = 26;

const s = StyleSheet.create({
  touchArea: { height: 48, justifyContent: 'center' },
  compactTouchArea: { height: 38 },
  disabled: { opacity: 0.5 },
  track: { height: 12, borderRadius: 6, position: 'relative', overflow: 'visible' },
  fill: { height: 12, borderRadius: 6 },
  thumb: {
    position: 'absolute', top: -7, width: THUMB_SIZE, height: THUMB_SIZE,
    borderRadius: 13, borderWidth: 3,
  },
});
