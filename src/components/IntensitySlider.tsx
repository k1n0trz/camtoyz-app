import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { palette } from '@/theme/index';

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export default function IntensitySlider({ value, onChange }: Props) {
  const width = useRef(1);
  const [trackWidth, setTrackWidth] = useState(1);

  const update = useCallback((event: GestureResponderEvent) => {
    const percent = Math.round(Math.max(0, Math.min(1, event.nativeEvent.locationX / width.current)) * 100);
    onChange(percent);
  }, [onChange]);

  const thumbLeft = Math.max(0, Math.min(trackWidth - THUMB_SIZE, (trackWidth * value) / 100 - THUMB_SIZE / 2));

  return <View
    accessible
    accessibilityLabel="Nivel máximo de vibración"
    accessibilityRole="adjustable"
    accessibilityValue={{ min: 0, max: 100, now: value, text: `${value}%` }}
    accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
    onAccessibilityAction={({ nativeEvent }) => {
      if (nativeEvent.actionName === 'increment') onChange(Math.min(100, value + 5));
      if (nativeEvent.actionName === 'decrement') onChange(Math.max(0, value - 5));
    }}
    onLayout={({ nativeEvent }) => {
      const measured = Math.max(1, nativeEvent.layout.width);
      width.current = measured;
      setTrackWidth(measured);
    }}
    onStartShouldSetResponder={() => true}
    onMoveShouldSetResponder={() => true}
    onResponderGrant={update}
    onResponderMove={update}
    onResponderTerminationRequest={() => false}
    style={s.touchArea}
  >
    <View pointerEvents="none" style={s.track}>
      <View style={[s.fill, { width: (trackWidth * value) / 100 }]} />
      <View style={[s.thumb, { left: thumbLeft }]} />
    </View>
  </View>;
}

const THUMB_SIZE = 26;

const s = StyleSheet.create({
  touchArea: { height: 48, justifyContent: 'center' },
  track: { height: 12, borderRadius: 6, backgroundColor: palette.border, position: 'relative', overflow: 'visible' },
  fill: { height: 12, borderRadius: 6, backgroundColor: palette.accent },
  thumb: {
    position: 'absolute', top: -7, width: THUMB_SIZE, height: THUMB_SIZE,
    borderRadius: 13, backgroundColor: palette.primary, borderWidth: 3, borderColor: palette.card,
  },
});
