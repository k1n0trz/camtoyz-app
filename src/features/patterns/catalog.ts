export type PatternCategoryId = 'constant' | 'waves' | 'bursts';

export interface PatternDefinition {
  id: number;
  label: string;
  category: PatternCategoryId;
  waveform: readonly number[];
}

export interface PatternCategory {
  id: PatternCategoryId;
  label: string;
  patterns: readonly PatternDefinition[];
}

/**
 * Catálogo visual independiente del firmware. El dispositivo decide qué IDs
 * se habilitan mediante sus capacidades FFE4; así se puede ampliar la UI sin
 * exponer comandos no soportados.
 */
export const patternCatalog: readonly PatternDefinition[] = [
  { id: 1, label: 'P1', category: 'constant', waveform: [6, 6, 6, 6] },
  { id: 2, label: 'P2', category: 'constant', waveform: [11, 11, 11, 11] },
  { id: 3, label: 'P3', category: 'constant', waveform: [16, 16, 16, 16] },
  { id: 4, label: 'P4', category: 'waves', waveform: [5, 10, 16, 10] },
  { id: 5, label: 'P5', category: 'waves', waveform: [16, 10, 5, 10] },
  { id: 6, label: 'P6', category: 'waves', waveform: [6, 14, 6, 14] },
  { id: 7, label: 'P7', category: 'waves', waveform: [10, 16, 10, 5] },
  { id: 8, label: 'P8', category: 'waves', waveform: [14, 8, 14, 8] },
  { id: 9, label: 'P9', category: 'bursts', waveform: [16, 4, 4, 16] },
  { id: 10, label: 'P10', category: 'bursts', waveform: [4, 16, 16, 4] },
];

export const patternCategories: readonly PatternCategory[] = [
  {
    id: 'constant',
    label: 'Constantes',
    patterns: patternCatalog.filter((pattern) => pattern.category === 'constant'),
  },
  {
    id: 'waves',
    label: 'Ondas',
    patterns: patternCatalog.filter((pattern) => pattern.category === 'waves'),
  },
  {
    id: 'bursts',
    label: 'Ráfagas',
    patterns: patternCatalog.filter((pattern) => pattern.category === 'bursts'),
  },
];

export const featuredPatterns = patternCatalog.slice(0, 5);

export function isPatternSupported(pattern: PatternDefinition, patternCount?: number): boolean {
  return patternCount !== undefined && pattern.id <= patternCount;
}
