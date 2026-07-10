import { palette, paletteDark, typography, radii, spacing, shadow, patternGrid } from './tokens';

export const lightTheme = {
  mode: 'light' as const,
  colors: palette,
  typography,
  radii,
  spacing,
  shadow,
  patternGrid,
};

export const darkTheme = {
  ...lightTheme,
  mode: 'dark' as const,
  colors: paletteDark,
};

export type AppTheme = typeof lightTheme;

export * from './tokens';
