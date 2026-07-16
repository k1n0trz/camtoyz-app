import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { useTranslation } from '@/i18n/useTranslation';
import { useAppTheme } from '@/preferences/AppPreferences';

export function BackButton({
  onPress,
  inverted = false,
  style,
}: {
  onPress: () => void;
  inverted?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <Text style={[styles.icon, { color: inverted ? '#FFFFFF' : theme.colors.ink }]}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  icon: { fontSize: 36, lineHeight: 40, marginTop: -5 },
  pressed: { opacity: 0.55 },
});
