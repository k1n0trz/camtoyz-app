import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, Text, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { useTranslation } from '@/i18n/useTranslation';
import { useAppTheme } from '@/preferences/AppPreferences';
import type { AppTheme } from '@/theme/index';
import { useThemedStyles } from '@/theme/useThemedStyles';

export const SUPPORT_EMAIL = 'support.app@camtoyz.com';

export function RoomPolicyLinks({ compact = false }: { compact?: boolean }) {
  const s = useThemedStyles(createStyles);
  const { pick } = useTranslation();

  const showRules = () => Alert.alert(
    pick('Reglas de la sala', 'Room rules'),
    pick(
      'Solo para mayores de 18 años. Comparte el código únicamente con la persona autorizada. Respeta sus límites y su decisión de retirarse. No grabes, captures ni difundas audio, video o imágenes sin autorización. Se prohíben el acoso, las amenazas, la coerción, la suplantación y cualquier conducta ilegal.',
      'Adults 18+ only. Share the code only with the authorized person. Respect their boundaries and decision to withdraw. Do not record, capture, or share audio, video, or images without permission. Harassment, threats, coercion, impersonation, and illegal conduct are prohibited.',
    ),
  );

  const showPrivacy = () => Alert.alert(
    pick('Privacidad y soporte', 'Privacy and support'),
    pick(
      `Video, audio y comandos usan WebRTC cifrado y pueden pasar por un relevo TURN cuando la red lo requiere. La app no incorpora una función de grabación. El servidor mantiene la sala de forma temporal y no almacena el contenido multimedia. Soporte: ${SUPPORT_EMAIL}`,
      `Video, audio, and commands use encrypted WebRTC and may pass through a TURN relay when required by the network. The app does not include a recording feature. The server keeps the room temporarily and does not store media content. Support: ${SUPPORT_EMAIL}`,
    ),
  );

  return (
    <View style={[s.policyLinks, compact && s.compactPolicyLinks]}>
      <Pressable accessibilityRole="button" onPress={showRules} style={s.policyLink}>
        <Text style={s.policyLinkText}>{pick('Ver reglas de la sala', 'View room rules')}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={showPrivacy} style={s.policyLink}>
        <Text style={s.policyLinkText}>{pick('Privacidad y soporte', 'Privacy and support')}</Text>
      </Pressable>
      {!compact ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={pick('Escribir a soporte', 'Email support')}
          onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        >
          <Text selectable style={s.supportEmail}>{SUPPORT_EMAIL}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function RoomConsentCard({
  accepted,
  onChange,
}: {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
}) {
  const s = useThemedStyles(createStyles);
  const { pick } = useTranslation();

  return (
    <View style={s.consentCard}>
      <Text style={s.consentTitle}>{pick('Consentimiento obligatorio', 'Required consent')}</Text>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        accessibilityLabel={pick(
          'Confirmo que tengo 18 años o más y acepto las condiciones de la sala',
          'I confirm that I am 18 or older and accept the room conditions',
        )}
        onPress={() => onChange(!accepted)}
        style={s.consentRow}
      >
        <View style={[s.checkbox, accepted && s.checkboxChecked]}>
          {accepted ? <Text style={s.checkmark}>✓</Text> : null}
        </View>
        <Text style={s.consentCopy}>
          {pick(
            'Declaro que tengo 18 años o más y participo voluntariamente. Acepto el uso de video, audio y, cuando corresponda, el control remoto del juguete. Puedo retirar mi consentimiento en cualquier momento saliendo de la sala. No grabaré, capturaré ni compartiré el contenido sin autorización expresa.',
            'I confirm that I am 18 or older and participate voluntarily. I consent to video, audio, and, when applicable, remote toy control. I may withdraw consent at any time by leaving the room. I will not record, capture, or share content without explicit permission.',
          )}
        </Text>
      </Pressable>
      <RoomPolicyLinks compact />
    </View>
  );
}

export function RoomHeader({
  title,
  badge,
  onBack,
}: {
  title: string;
  badge?: 'ANFITRIÓN' | 'MIEMBRO';
  onBack: () => void;
}) {
  const s = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const badgeLabel = badge === 'ANFITRIÓN'
    ? t('common.host')
    : badge === 'MIEMBRO'
      ? t('common.member')
      : undefined;
  return (
    <View style={s.header}>
      <BackButton onPress={onBack} />
      <Text numberOfLines={1} style={s.title}>{title}</Text>
      <View style={{ flex: 1 }} />
      {badgeLabel ? (
        <Text style={[s.badge, badge === 'MIEMBRO' && s.memberBadge]}>{badgeLabel}</Text>
      ) : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  outline = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  outline?: boolean;
}) {
  const s = useThemedStyles(createStyles);
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={[s.button, outline && s.outlineButton, (disabled || loading) && s.disabled]}
    >
      {loading
        ? <ActivityIndicator color={theme.colors.ink} />
        : <Text style={[s.buttonLabel, outline && s.outlineLabel]}>{label}</Text>}
    </Pressable>
  );
}

export function PrivacyCard({ compact = false }: { compact?: boolean }) {
  const s = useThemedStyles(createStyles);
  const { t } = useTranslation();
  return (
    <View style={[s.privacyCard, compact && s.compactPrivacyCard]}>
      <View style={s.lock}><View style={s.lockDot} /></View>
      <Text numberOfLines={compact ? 2 : undefined} style={s.privacyText}>{t('room.privacy')}</Text>
    </View>
  );
}

export function RemoteControlSafetyCard({
  allowed,
  connected,
  onChange,
  onStop,
  compact = false,
  inverted = false,
}: {
  allowed: boolean;
  connected: boolean;
  onChange: (allowed: boolean) => Promise<void>;
  onStop: () => Promise<void>;
  compact?: boolean;
  inverted?: boolean;
}) {
  const s = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const foreground = inverted ? '#FFFFFF' : undefined;
  return (
    <View style={[s.safetyCard, compact && s.compactSafetyCard, inverted && s.invertedCard]}>
      <Text style={[s.safetyTitle, foreground ? { color: foreground } : undefined]}>
        {t('room.safetyTitle')}
      </Text>
      {!compact ? (
        <Text style={s.safetyCopy}>
          {allowed
            ? t('room.allowedCopy')
            : connected
              ? t('room.connectedCopy')
              : t('room.waitingCopy')}
        </Text>
      ) : null}
      <View style={compact ? s.compactSafetyActions : undefined}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={allowed ? t('room.revokeControl') : t('room.allowControl')}
          disabled={!connected && !allowed}
          onPress={() => void onChange(!allowed)}
          style={[
            s.permissionButton,
            compact && s.compactSafetyButton,
            allowed && s.permissionButtonActive,
            !connected && !allowed && s.disabled,
          ]}
        >
          <Text style={[s.permissionLabel, allowed && s.permissionLabelActive]}>
            {allowed ? t('room.revokeControl') : t('room.allowControl')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('room.stopNow')}
          onPress={() => void onStop()}
          style={[s.emergencyButton, compact && s.compactSafetyButton]}
        >
          <Text style={s.emergencyLabel}>{t('room.stopNow')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function RoomStatus({ children, inverted = false }: { children: ReactNode; inverted?: boolean }) {
  const s = useThemedStyles(createStyles);
  return (
    <View style={[s.status, inverted && s.invertedStatus]}>
      <View style={s.statusDot} />
      <Text style={[s.statusText, inverted && { color: '#FFFFFF' }]}>{children}</Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  header: {
    height: 64,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  title: { ...theme.typography.section, color: theme.colors.ink, maxWidth: '64%' as const },
  badge: {
    backgroundColor: theme.colors.accent,
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.radii.pill,
  },
  memberBadge: { backgroundColor: theme.colors.secondary, color: theme.colors.ink },
  button: {
    minHeight: 54,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: theme.spacing.xl,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
  },
  buttonLabel: { fontSize: 16, fontWeight: '700' as const, color: theme.colors.ink },
  outlineLabel: { color: theme.colors.accent },
  disabled: { opacity: 0.4 },
  privacyCard: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
    alignItems: 'flex-start' as const,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
  },
  compactPrivacyCard: { padding: theme.spacing.sm, backgroundColor: 'rgba(20,10,30,.7)' },
  lock: {
    width: 16,
    height: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.textSecondary,
    borderRadius: 5,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 1,
  },
  lockDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.textSecondary,
  },
  privacyText: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
  consentCard: {
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    borderRadius: theme.radii.cardLg,
    padding: theme.spacing.lg,
  },
  consentTitle: {
    ...theme.typography.label,
    color: theme.colors.ink,
    fontWeight: '800' as const,
  },
  consentRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: theme.spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderRadius: 6,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: theme.colors.accent },
  checkmark: { color: theme.colors.white, fontSize: 16, fontWeight: '900' as const, lineHeight: 18 },
  consentCopy: {
    ...theme.typography.small,
    color: theme.colors.textSubtle,
    lineHeight: 18,
    flex: 1,
  },
  policyLinks: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm,
  },
  compactPolicyLinks: { paddingLeft: 36 },
  policyLink: {
    minHeight: 34,
    justifyContent: 'center' as const,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    paddingHorizontal: theme.spacing.md,
  },
  policyLinkText: {
    ...theme.typography.small,
    color: theme.colors.accent,
    fontWeight: '700' as const,
  },
  supportEmail: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    textDecorationLine: 'underline' as const,
  },
  status: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    alignSelf: 'center' as const,
    gap: 8,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.pill,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  invertedStatus: {
    backgroundColor: 'rgba(20,10,30,.72)',
    borderColor: 'rgba(255,255,255,.24)',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.accent },
  statusText: { ...theme.typography.body, color: theme.colors.ink, fontWeight: '600' as const },
  safetyCard: {
    gap: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderRadius: theme.radii.cardLg,
    padding: theme.spacing.xl,
  },
  compactSafetyCard: { gap: theme.spacing.sm, padding: theme.spacing.md },
  invertedCard: { backgroundColor: 'rgba(20,10,30,.78)', borderColor: 'rgba(255,255,255,.3)' },
  safetyTitle: { ...theme.typography.section, color: theme.colors.ink },
  safetyCopy: { ...theme.typography.body, color: theme.colors.textSubtle, lineHeight: 20 },
  compactSafetyActions: { flexDirection: 'row' as const, gap: theme.spacing.sm },
  permissionButton: {
    minHeight: 48,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: theme.spacing.md,
  },
  compactSafetyButton: { minHeight: 40, flex: 1, paddingHorizontal: theme.spacing.sm },
  permissionButtonActive: {
    backgroundColor: theme.colors.tint,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
  },
  permissionLabel: {
    ...theme.typography.label,
    color: theme.colors.ink,
    fontWeight: '700' as const,
    textAlign: 'center' as const,
  },
  permissionLabelActive: { color: theme.colors.accent },
  emergencyButton: {
    minHeight: 52,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.accent,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: theme.spacing.md,
  },
  emergencyLabel: {
    ...theme.typography.label,
    color: theme.colors.white,
    fontWeight: '900' as const,
    letterSpacing: 0.6,
    textAlign: 'center' as const,
  },
});
