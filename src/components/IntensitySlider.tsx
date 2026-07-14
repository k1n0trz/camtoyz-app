import { useCallback, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { palette } from '@/theme';

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export default function IntensitySlider({ value, onChange }: Props) {
  const [width, setWidth] = useState(1);

  const update = useCallback((event: GestureResponderEvent) => {
    const percent = Math.round(Math.max(0, Math.min(1, event.nativeEvent.locationX / width)) * 100);
    onChange(percent);
  }, [onChange, width]);

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
    onLayout={({ nativeEvent }) => setWidth(Math.max(1, nativeEvent.layout.width))}
    onStartShouldSetResponder={() => true}
    onMoveShouldSetResponder={() => true}
    onResponderGrant={update}
    onResponderMove={update}
    onResponderTerminationRequest={() => false}
    style={s.touchArea}
  >
    <View style={s.track}>
      <View style={[s.fill, { width: `${value}%` }]} />
      <View style={[s.thumb, { left: `${value}%` }]} />
    </View>
  </View>;
}

const s = StyleSheet.create({
  touchArea: { height: 48, justifyContent: 'center' },
  track: { height: 12, borderRadius: 6, backgroundColor: palette.border, position: 'relative' },
  fill: { height: 12, borderRadius: 6, backgroundColor: palette.accent },
  thumb: {
    position: 'absolute', top: -7, width: 26, height: 26, marginLeft: -13,
    borderRadius: 13, backgroundColor: palette.primary, borderWidth: 3, borderColor: palette.card,
  },
});
