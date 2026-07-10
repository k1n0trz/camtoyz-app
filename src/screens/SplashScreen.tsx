import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '@/navigation/routes';
import { Logo } from '@/components/Logo';
import { palette, radii, spacing, typography } from '@/theme';

/**
 * 01 Splash — patrón de referencia para el resto de pantallas.
 * Layout fiel al frame de diseño: logo centrado, spinner "Verificando carga",
 * CTA primario (rosa) + secundario (outline).
 */
type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={s.root}>
      <View style={s.center}>
        <Logo width={230} color={palette.accent} />
        <View style={s.status}>
          <ActivityIndicator color={palette.accent} />
          <Text style={s.statusTitle}>Verificando carga</Text>
          <Text style={s.statusSub}>
            Mantén pulsado el botón{'\n'}del dispositivo para encenderlo
          </Text>
        </View>
      </View>
      <View style={s.actions}>
        <Pressable style={s.primary} onPress={() => navigation.navigate('Dashboard')}>
          <Text style={s.primaryLabel}>Comenzar juego</Text>
        </Pressable>
        <Pressable style={s.secondary} onPress={() => navigation.navigate('Dashboard')}>
          <Text style={s.secondaryLabel}>Modo control remoto</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg, paddingHorizontal: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 56 },
  status: { alignItems: 'center', gap: 22 },
  statusTitle: { ...typography.label, fontSize: 15, fontWeight: '700', color: palette.ink },
  statusSub: { ...typography.body, color: palette.textSecondary, textAlign: 'center', lineHeight: 20 },
  actions: { paddingBottom: 44, gap: 12 },
  primary: {
    height: 54,
    backgroundColor: palette.primary,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { fontSize: 16, fontWeight: '700', color: palette.ink },
  secondary: {
    height: 54,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { fontSize: 15, fontWeight: '600', color: palette.ink },
});
