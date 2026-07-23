import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import IntensitySlider from '@/components/IntensitySlider';
import { useTranslation } from '@/i18n/useTranslation';
import { useAppTheme } from '@/preferences/AppPreferences';

interface Props {
  channelCount: number;
  values: readonly number[];
  onChange: (channel: number, value: number, values: readonly number[]) => void;
  disabled?: boolean;
  compact?: boolean;
  inverted?: boolean;
}

function normalizeValues(source: readonly number[], count: number): number[] {
  return Array.from(
    { length: count },
    (_, channel) => Math.max(0, Math.min(100, source[channel] ?? 0)),
  );
}

export function MotorIntensityMixer({
  channelCount,
  values,
  onChange,
  disabled = false,
  compact = false,
  inverted = false,
}: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const count = Math.max(1, channelCount);
  const foreground = inverted ? '#FFFFFF' : theme.colors.ink;
  const muted = inverted ? '#EEDDE7' : theme.colors.textSecondary;
  const border = inverted ? 'rgba(255,255,255,.22)' : theme.colors.border;
  const [displayValues, setDisplayValues] = useState<number[]>(() => normalizeValues(values, count));
  const displayValuesRef = useRef(displayValues);
  const lastSentAt = useRef(new Map<number, number>());
  const pending = useRef(new Map<number, number>());
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const next = normalizeValues(values, count);
    displayValuesRef.current = next;
    setDisplayValues(next);
  }, [count, values]);

  useEffect(() => () => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
  }, []);

  const flush = (channel: number) => {
    const next = pending.current.get(channel);
    if (next === undefined) return;
    pending.current.delete(channel);
    const timer = timers.current.get(channel);
    if (timer) clearTimeout(timer);
    timers.current.delete(channel);
    lastSentAt.current.set(channel, Date.now());
    onChange(channel, next, [...displayValuesRef.current]);
  };

  const queueChange = (channel: number, next: number) => {
    const updated = displayValuesRef.current.map(
      (current, index) => index === channel ? next : current,
    );
    displayValuesRef.current = updated;
    setDisplayValues(updated);
    pending.current.set(channel, next);

    const elapsed = Date.now() - (lastSentAt.current.get(channel) ?? 0);
    if (elapsed >= COMMAND_INTERVAL_MS && !timers.current.has(channel)) {
      flush(channel);
      return;
    }
    if (!timers.current.has(channel)) {
      timers.current.set(
        channel,
        setTimeout(() => flush(channel), Math.max(0, COMMAND_INTERVAL_MS - elapsed)),
      );
    }
  };

  return (
    <View
      accessibilityLabel={t('motors.independent')}
      style={[styles.container, compact && styles.compactContainer]}
    >
      {Array.from({ length: count }, (_, channel) => {
        const value = displayValues[channel] ?? 0;
        return (
          <View
            key={channel}
            style={[
              styles.motor,
              compact && styles.compactMotor,
              { borderColor: border },
              disabled && styles.disabled,
            ]}
          >
            <View style={styles.heading}>
              <Text style={[styles.name, compact && styles.compactName, { color: foreground }]}>
                {t('motors.one', { number: channel + 1 })}
              </Text>
              <Text style={[styles.value, compact && styles.compactValue, { color: muted }]}>
                {value}%
              </Text>
            </View>
            <IntensitySlider
              value={value}
              disabled={disabled}
              compact={compact}
              inverted={inverted}
              accessibilityLabel={`${t('motors.one', { number: channel + 1 })}: ${t('room.intensity')}`}
              onChange={(next) => queueChange(channel, next)}
            />
          </View>
        );
      })}
    </View>
  );
}

const COMMAND_INTERVAL_MS = 45;

const styles = StyleSheet.create({
  container: { gap: 10 },
  compactContainer: { gap: 6 },
  motor: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 2,
  },
  compactMotor: {
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 0,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: { fontSize: 13, fontWeight: '800' },
  compactName: { fontSize: 11 },
  value: { fontSize: 13, fontWeight: '800' },
  compactValue: { fontSize: 11 },
  disabled: { opacity: 0.45 },
});
