import type { ReactNode } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';

import { RoomHeader } from '@/components/RoomUi';
import { useTranslation } from '@/i18n/useTranslation';
import { goBackOr } from '@/navigation/back';
import type { RootStackParamList } from '@/navigation/routes';
import {
  useAppPreferences,
  type LanguagePreference,
  type ThemePreference,
} from '@/preferences/AppPreferences';
import type { AppTheme } from '@/theme/index';
import { useThemedStyles } from '@/theme/useThemedStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'SettingsDevice'>;

export default function SettingsDeviceScreen({ navigation }: Props) {
  const s = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const {
    languagePreference,
    themePreference,
    setLanguagePreference,
    setThemePreference,
  } = useAppPreferences();
  const version = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '0.9.2';
  const build = Constants.nativeBuildVersion ?? '11';

  const InfoCard = ({ title, children }: { title: string; children: ReactNode }) => (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      <Text style={s.cardCopy}>{children}</Text>
    </View>
  );

  const PreferenceRow = <T extends string>({
    label,
    value,
    options,
    onChange,
  }: {
    label: string;
    value: T;
    options: readonly { value: T; label: string }[];
    onChange: (value: T) => Promise<void>;
  }) => (
    <View style={s.preferenceGroup}>
      <Text style={s.cardTitle}>{label}</Text>
      <View style={s.options}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: option.value === value }}
            onPress={() => void onChange(option.value)}
            style={[s.option, option.value === value && s.optionActive]}
          >
            <Text style={[s.optionLabel, option.value === value && s.optionLabelActive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const themeOptions: readonly { value: ThemePreference; label: string }[] = [
    { value: 'light', label: t('settings.theme.light') },
    { value: 'dark', label: t('settings.theme.dark') },
  ];
  const languageOptions: readonly { value: LanguagePreference; label: string }[] = [
    { value: 'system', label: t('settings.language.system') },
    { value: 'es', label: t('settings.language.es') },
    { value: 'en', label: t('settings.language.en') },
  ];

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <RoomHeader title={t('settings.title')} onBack={() => goBackOr(navigation, 'Dashboard')} />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.card}>
          <Text style={s.sectionTitle}>{t('settings.appearance')}</Text>
          <PreferenceRow
            label={t('settings.theme')}
            value={themePreference}
            options={themeOptions}
            onChange={setThemePreference}
          />
          <PreferenceRow
            label={t('settings.language')}
            value={languagePreference}
            options={languageOptions}
            onChange={setLanguagePreference}
          />
        </View>
        <InfoCard title={t('settings.internalVersion')}>
          {t('settings.versionCopy', { version, build })}
        </InfoCard>
        <InfoCard title={t('settings.permissions')}>{t('settings.permissionsCopy')}</InfoCard>
        <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={s.button}>
          <Text style={s.buttonLabel}>{t('settings.openSystem')}</Text>
        </Pressable>
        <InfoCard title={t('settings.remoteSafety')}>{t('settings.remoteSafetyCopy')}</InfoCard>
        <InfoCard title={t('settings.roomServer')}>{t('settings.roomServerCopy')}</InfoCard>
        <View style={s.pendingCard}>
          <Text style={s.pendingTitle}>{t('settings.pending')}</Text>
          <Text style={s.pendingCopy}>{t('settings.pendingCopy')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.cardLg,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  sectionTitle: { ...theme.typography.section, color: theme.colors.ink },
  cardTitle: { ...theme.typography.label, color: theme.colors.ink, fontWeight: '700' as const },
  cardCopy: { ...theme.typography.body, color: theme.colors.textSubtle, lineHeight: 20 },
  preferenceGroup: { gap: theme.spacing.sm },
  options: { flexDirection: 'row' as const, gap: theme.spacing.sm },
  option: {
    flex: 1,
    minHeight: 42,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: theme.spacing.sm,
  },
  optionActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  optionLabel: { ...theme.typography.small, color: theme.colors.textSecondary, fontWeight: '600' as const },
  optionLabelActive: { color: theme.colors.ink, fontWeight: '800' as const },
  button: {
    minHeight: 50,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: theme.spacing.lg,
  },
  buttonLabel: { ...theme.typography.label, color: theme.colors.ink, fontWeight: '700' as const },
  pendingCard: {
    backgroundColor: theme.colors.tint,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    borderRadius: theme.radii.cardLg,
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  pendingTitle: { ...theme.typography.section, color: theme.colors.ink },
  pendingCopy: { ...theme.typography.body, color: theme.colors.textSubtle, lineHeight: 20 },
});
