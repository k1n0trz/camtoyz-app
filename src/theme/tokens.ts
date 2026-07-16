/**
 * Camtoyz App — Design Tokens
 * Fuente de verdad: "Camtoyz App - Sistema de pantallas.dc.html" (Claude Design, aprobado por Edison Múnera).
 * Paleta canónica: rosa/lila (Pantone). SIN rojo.
 *
 * Regla: NINGÚN componente debe usar colores hardcodeados. Todo sale de aquí.
 */

export const palette = {
  // Núcleo de marca (Pantone)
  primary: '#E9B3CB', // P203 — CTAs, fills, chips
  accent: '#A53B65', // P7433 — acento fuerte: badge Anfitrión, estados activos, strokes
  secondary: '#DFC6E5', // P531 — badge Miembro, superficies suaves
  ink: '#3D2A57', // P669 — texto principal y detalles

  // Fondos y superficies (modo claro = identidad)
  bg: '#FAF0F5', // base de pantalla
  bgAlt: '#F3E1EB', // fondo de overlay/scan
  card: '#FFFFFF', // tarjetas
  tint: '#F3DFE9', // icon chips / fills suaves
  tint2: '#F7E9F1', // avatar / chips

  // Bordes
  border: '#F0D9E4', // borde sutil
  borderStrong: '#EBD0DD', // borde de card/pill

  // Texto secundario
  textSecondary: '#8B4F6C',
  textMuted: '#76506A',
  textFaint: '#6F5B85',
  textSubtle: '#5F4B77',
  textLabel: '#6E5987',

  // Estados
  success: '#A53B65', // "conectado" usa el acento (no hay verde en la marca)
  danger: '#A53B65', // destructivo = outline acento (no hay rojo)
  overlay: 'rgba(61,42,87,.34)', // scrim de bottom sheets

  white: '#FFFFFF',
} as const;

/** Modo oscuro opcional — predomina P669. Mismo primario. */
export const paletteDark = {
  ...palette,
  bg: '#241833',
  bgAlt: '#2C1E40',
  card: '#3D2A57',
  tint: '#4A335F',
  tint2: '#432E57',
  ink: '#F6ECF3',
  border: '#4A365F',
  borderStrong: '#5A426F',
  textSecondary: '#DFC6E5',
  textMuted: '#C7A9BC',
  textFaint: '#BDA7CF',
  textSubtle: '#D1BADB',
  textLabel: '#CFB8DD',
  overlay: 'rgba(8,4,16,.72)',
  white: '#FFFFFF',
} as const;

export const typography = {
  family: 'Archivo', // fallback: Helvetica / system sans
  // escala tomada del token board del diseño
  h1: { fontSize: 26, fontWeight: '800' as const, letterSpacing: -0.26 },
  h2: { fontSize: 20, fontWeight: '700' as const },
  section: { fontSize: 17, fontWeight: '700' as const },
  label: { fontSize: 14, fontWeight: '600' as const },
  body: { fontSize: 13, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
  mono: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 1.68 },
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 14,
  card: 16,
  cardLg: 18,
  sheet: 26,
  frame: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

/** Grid de patrones escalable — nunca romper el layout al añadir ítems. */
export const patternGrid = {
  minCell: 58, // repeat(auto-fill, minmax(58px, 1fr))
  gap: 10,
} as const;

export const shadow = {
  frame: {
    shadowColor: '#A53B65',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  card: {
    shadowColor: '#A53B65',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
} as const;

export type Palette = { [Key in keyof typeof palette]: string };
