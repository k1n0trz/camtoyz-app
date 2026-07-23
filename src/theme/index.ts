import { palette, paletteDark, typography, radii, spacing, shadow, patternGrid } from './tokens';

export interface AppTheme {
  mode: 'light' | 'dark';
  colors: typeof palette | typeof paletteDark;
  typography: typeof typography;
  radii: typeof radii;
  spacing: typeof spacing;
  shadow: typeof shadow;
  patternGrid: typeof patternGrid;
}

export const lightTheme: AppTheme = {
  mode: 'light' as const,
  colors: palette,
  typography,
  radii,
  spacing,
  shadow,
  patternGrid,
};

export const darkTheme: AppTheme = {
  ...lightTheme,
  mode: 'dark' as const,
  colors: paletteDark,
};

export * from './tokens';
