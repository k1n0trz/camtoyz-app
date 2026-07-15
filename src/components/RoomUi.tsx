import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radii, spacing, typography } from '@/theme';

export function RoomHeader({ title, badge, onBack }: { title: string; badge?: 'ANFITRIÓN' | 'MIEMBRO'; onBack: () => void }) {
  return (
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onBack} style={s.back}>
        <Text style={s.backText}>‹</Text>
      </Pressable>
      <Text style={s.title}>{title}</Text>
      <View style={{ flex: 1 }} />
      {badge ? <Text style={[s.badge, badge === 'MIEMBRO' && s.memberBadge]}>{badge}</Text> : null}
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled, loading, outline = false }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  outline?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={[s.button, outline && s.outlineButton, (disabled || loading) && s.disabled]}
    >
      {loading ? <ActivityIndicator color={palette.ink} /> : <Text style={[s.buttonLabel, outline && s.outlineLabel]}>{label}</Text>}
    </Pressable>
  );
}

export function PrivacyCard() {
  return (
    <View style={s.privacyCard}>
      <View style={s.lock}><View style={s.lockDot} /></View>
      <Text style={s.privacyText}>Video y comandos usan un canal cifrado. Si la red lo requiere, TURN retransmite paquetes cifrados sin leer su contenido; el servidor de salas gestiona acceso y señalización.</Text>
    </View>
  );
}

export function RemoteControlSafetyCard({ allowed, connected, onChange, onStop }: {
  allowed: boolean;
  connected: boolean;
  onChange: (allowed: boolean) => Promise<void>;
  onStop: () => Promise<void>;
}) {
  return (
    <View style={s.safetyCard}>
      <Text style={s.safetyTitle}>Seguridad del control remoto</Text>
      <Text style={s.safetyCopy}>
        {allowed
          ? 'Control permitido para la otra persona. Puedes revocarlo y detener la vibración en cualquier momento.'
          : connected
            ? 'La otra persona está conectada, pero no puede controlar el juguete hasta que tú lo permitas.'
            : 'Cuando se conecte la otra persona, decide aquí si puede controlar el juguete.'}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={allowed ? 'Revocar control remoto y detener' : 'Permitir control remoto'}
        disabled={!connected && !allowed}
        onPress={() => void onChange(!allowed)}
        style={[s.permissionButton, allowed && s.permissionButtonActive, !connected && !allowed && s.disabled]}
      >
        <Text style={[s.permissionLabel, allowed && s.permissionLabelActive]}>{allowed ? 'Revocar control y detener' : 'Permitir control remoto'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Detener vibración ahora" onPress={() => void onStop()} style={s.emergencyButton}>
        <Text style={s.emergencyLabel}>DETENER AHORA</Text>
      </Pressable>
    </View>
  );
}

export function RoomStatus({ children }: { children: ReactNode }) {
  return <View style={s.status}><View style={s.statusDot} /><Text style={s.statusText}>{children}</Text></View>;
}

const s = StyleSheet.create({
  header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  back: { width: 28, height: 40, justifyContent: 'center' },
  backText: { fontSize: 28, color: palette.ink, marginTop: -4 },
  title: { ...typography.section, color: palette.ink },
  badge: { backgroundColor: palette.accent, color: palette.white, fontSize: 10, fontWeight: '800', letterSpacing: 1, paddingVertical: 5, paddingHorizontal: 10, borderRadius: radii.pill },
  memberBadge: { backgroundColor: palette.secondary, color: palette.ink },
  button: { minHeight: 54, backgroundColor: palette.primary, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  outlineButton: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: palette.accent },
  buttonLabel: { fontSize: 16, fontWeight: '700', color: palette.ink },
  outlineLabel: { color: palette.accent },
  disabled: { opacity: 0.4 },
  privacyCard: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: radii.lg, padding: spacing.lg },
  lock: { width: 16, height: 18, borderWidth: 1.5, borderColor: palette.textSecondary, borderRadius: 5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  lockDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: palette.textSecondary },
  privacyText: { ...typography.small, color: palette.textSecondary, lineHeight: 18, flex: 1 },
  status: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 8, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: radii.pill, paddingVertical: 10, paddingHorizontal: 16 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.accent },
  statusText: { ...typography.body, color: palette.ink, fontWeight: '600' },
  safetyCard: { gap: spacing.md, backgroundColor: palette.card, borderWidth: 2, borderColor: palette.accent, borderRadius: radii.cardLg, padding: spacing.xl },
  safetyTitle: { ...typography.section, color: palette.ink },
  safetyCopy: { ...typography.body, color: palette.textSubtle, lineHeight: 20 },
  permissionButton: { minHeight: 48, borderRadius: radii.lg, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  permissionButtonActive: { backgroundColor: palette.tint, borderWidth: 1.5, borderColor: palette.accent },
  permissionLabel: { ...typography.label, color: palette.ink, fontWeight: '700', textAlign: 'center' },
  permissionLabelActive: { color: palette.accent },
  emergencyButton: { minHeight: 52, borderRadius: radii.lg, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  emergencyLabel: { ...typography.label, color: palette.white, fontWeight: '900', letterSpacing: 0.6 },
});
