import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useAppTheme } from '@/preferences/AppPreferences';
import { palette, type Palette } from '@/theme/tokens';

function replaceThemeColors(value: unknown, colors: Palette): unknown {
  if (typeof value === 'string') {
    const key = (Object.keys(palette) as (keyof Palette)[])
      .find((candidate) => palette[candidate] === value);
    return key ? colors[key] : value;
  }
  if (Array.isArray(value)) return value.map((item) => replaceThemeColors(item, colors));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceThemeColors(item, colors)]),
    );
  }
  return value;
}

/**
 * Adapta hojas legadas construidas con la paleta clara. Permite que todas las
 * pantallas respondan al tema mientras los estilos se migran a tokens dinámicos.
 */
export function useAdaptiveStyles<T extends StyleSheet.NamedStyles<T>>(baseStyles: T): T {
  const theme = useAppTheme();
  return useMemo(
    () => StyleSheet.create(replaceThemeColors(baseStyles, theme.colors) as T),
    [baseStyles, theme.colors],
  );
}
