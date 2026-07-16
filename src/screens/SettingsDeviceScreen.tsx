import type { ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';

import { RoomHeader } from '@/components/RoomUi';
import type { RootStackParamList } from '@/navigation/routes';
import { palette, radii, spacing, typography } from '@/theme/index';

type Props = NativeStackScreenProps<RootStackParamList, 'SettingsDevice'>;

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      <Text style={s.cardCopy}>{children}</Text>
    </View>
  );
}

export default function SettingsDeviceScreen({ navigation }: Props) {
  const version = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '0.9.1';
  const build = Constants.nativeBuildVersion ?? '10';

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <RoomHeader title="Ajustes" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={s.content}>
        <InfoCard title="Versión interna">Camtoyz App {version} · compilación {build}</InfoCard>
        <InfoCard title="Permisos">Bluetooth conecta los juguetes; micrófono habilita el control por sonido; cámara y audio solo se comparten cuando activas video en una sala.</InfoCard>
        <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={s.button}>
          <Text style={s.buttonLabel}>Abrir permisos del sistema</Text>
        </Pressable>
        <InfoCard title="Seguridad remota">El teléfono que tiene el juguete debe permitir el control en cada sala. Puede revocarlo o detener la vibración en cualquier momento.</InfoCard>
        <InfoCard title="Servidor de salas">Conexión cifrada mediante app.camtoyz.com. Las salas admiten como máximo dos participantes.</InfoCard>
        <View style={s.pendingCard}>
          <Text style={s.pendingTitle}>Documentación pendiente para 1.0.0</Text>
          <Text style={s.pendingCopy}>La política de privacidad, los términos y el correo de soporte se añadirán cuando sean aprobados. Esta 0.9.1 es exclusivamente para pruebas internas.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  card: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: radii.cardLg, padding: spacing.xl, gap: spacing.sm },
  cardTitle: { ...typography.section, color: palette.ink },
  cardCopy: { ...typography.body, color: palette.textSubtle, lineHeight: 20 },
  button: { minHeight: 50, borderRadius: radii.lg, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  buttonLabel: { ...typography.label, color: palette.ink, fontWeight: '700' },
  pendingCard: { backgroundColor: palette.tint, borderWidth: 1.5, borderColor: palette.accent, borderRadius: radii.cardLg, padding: spacing.xl, gap: spacing.sm },
  pendingTitle: { ...typography.section, color: palette.ink },
  pendingCopy: { ...typography.body, color: palette.textSubtle, lineHeight: 20 },
});
