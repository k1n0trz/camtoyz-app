import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n/useTranslation';
import { palette, radii, spacing, typography } from '@/theme/index';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

function RecoveryPanel({ onRetry }: { onRetry: () => void }) {
  const { pick } = useTranslation();
  return (
    <View style={s.root}>
      <View style={s.card}>
        <Text style={s.mark}>↻</Text>
        <Text style={s.title}>
          {pick('La aplicación necesita recuperar esta pantalla', 'The app needs to recover this screen')}
        </Text>
        <Text style={s.copy}>
          {pick(
            'Tus conexiones están protegidas. Toca el botón para volver a cargar la interfaz.',
            'Your connections are protected. Tap the button to reload the interface.',
          )}
        </Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={s.button}>
          <Text style={s.buttonLabel}>{pick('Recuperar aplicación', 'Recover app')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Evita que un error de interfaz deje al usuario frente a una pantalla vacía. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Camtoyz] Error de interfaz recuperable', error, info.componentStack);
  }

  private retry = () => {
    this.setState({ failed: false });
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return <RecoveryPanel onRetry={this.retry} />;
  }
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: palette.bg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
    borderRadius: radii.cardLg,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: palette.card,
  },
  mark: { fontSize: 42, lineHeight: 48, color: palette.accent },
  title: { ...typography.section, color: palette.ink, textAlign: 'center' },
  copy: { ...typography.body, color: palette.textSecondary, lineHeight: 21, textAlign: 'center' },
  button: {
    minHeight: 52,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: palette.primary,
  },
  buttonLabel: { ...typography.label, color: palette.ink, fontWeight: '700' },
});
