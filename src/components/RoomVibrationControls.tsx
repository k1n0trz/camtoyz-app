import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { MotorIntensityMixer } from '@/components/MotorIntensityMixer';
import { PatternTile } from '@/components/PatternTile';
import type { MotorTarget } from '@/ble/protocol';
import { featuredPatterns } from '@/features/patterns/catalog';
import { useTranslation } from '@/i18n/useTranslation';
import type { AppTheme } from '@/theme/index';
import { useThemedStyles } from '@/theme/useThemedStyles';

interface Props {
  connected: boolean;
  channelCount?: number;
  variant?: 'card' | 'overlay';
  onPattern: (pattern: number, target?: MotorTarget) => Promise<boolean>;
  onIntensity: (value: number, target?: MotorTarget) => Promise<boolean>;
  onStop: () => Promise<boolean>;
}

export function RoomVibrationControls({
  connected,
  channelCount = 1,
  variant = 'card',
  onPattern,
  onIntensity,
  onStop,
}: Props) {
  const s = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const overlay = variant === 'overlay';
  const [activePattern, setActivePattern] = useState<number>();
  const [intensities, setIntensities] = useState<number[]>(() => Array(channelCount).fill(45));

  useEffect(() => {
    setIntensities((current) =>
      Array.from({ length: channelCount }, (_, channel) => current[channel] ?? 45),
    );
  }, [channelCount]);

  const changeIntensity = useCallback((channel: number, value: number) => {
    setIntensities((current) => current.map((level, index) => index === channel ? value : level));
    setActivePattern(undefined);
    void onIntensity(value, channelCount > 1 ? channel : 'all');
  }, [channelCount, onIntensity]);

  const togglePattern = async (pattern: number) => {
    if (activePattern === pattern) {
      if (await onStop()) setActivePattern(undefined);
    } else if (await onPattern(pattern, 'all')) {
      setActivePattern(pattern);
    }
  };

  const stop = () => {
    void onStop().then((sent) => {
      if (sent) setActivePattern(undefined);
    });
  };

  return (
    <View style={[s.card, overlay && s.overlayCard]}>
      <View style={s.titleRow}>
        <Text style={[s.title, overlay && s.invertedText]}>{t('room.vibration')}</Text>
        {channelCount > 1 ? (
          <Text style={[s.independentHint, overlay && s.invertedMuted]}>{t('motors.independentHint')}</Text>
        ) : null}
      </View>
      <View style={[s.patterns, overlay && s.overlayPatterns]}>
        {featuredPatterns.map((pattern) => (
          <PatternTile
            key={pattern.id}
            pattern={pattern}
            active={activePattern === pattern.id}
            disabled={!connected}
            compact={overlay}
            inverted={overlay}
            onPress={() => void togglePattern(pattern.id)}
          />
        ))}
      </View>
      {!overlay ? (
        <View style={s.intensityHead}>
          <Text style={s.intensityLabel}>{t('room.intensity')}</Text>
        </View>
      ) : null}
      <MotorIntensityMixer
        channelCount={channelCount}
        values={intensities}
        onChange={changeIntensity}
        disabled={!connected}
        compact={overlay}
        inverted={overlay}
      />
      <Pressable
        accessibilityRole="button"
        disabled={!connected}
        onPress={stop}
        style={[s.stop, overlay && s.overlayStop, !connected && s.disabled]}
      >
        <Text style={[s.stopText, overlay && s.invertedText]}>{t('room.stopVibration')}</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.cardLg,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  overlayCard: {
    backgroundColor: 'rgba(20,10,30,.80)',
    borderColor: 'rgba(255,255,255,.28)',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  titleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  title: { ...theme.typography.section, color: theme.colors.ink },
  patterns: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 10 },
  overlayPatterns: { flexWrap: 'nowrap' as const, justifyContent: 'space-between' as const, gap: 4 },
  intensityHead: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  intensityLabel: { ...theme.typography.label, color: theme.colors.ink },
  independentHint: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    flexShrink: 1,
    textAlign: 'right' as const,
  },
  stop: {
    height: 44,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    borderRadius: theme.radii.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  overlayStop: { height: 38, borderColor: 'rgba(255,255,255,.5)' },
  stopText: { ...theme.typography.label, color: theme.colors.accent, fontWeight: '700' as const },
  invertedText: { color: '#FFFFFF' },
  invertedMuted: { color: '#F1DCE6' },
  disabled: { opacity: 0.4 },
});
