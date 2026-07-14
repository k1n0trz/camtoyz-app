export const GESTURE_THROTTLE_MS = 33;

export function clampIntensity(value: number): number {
  'worklet';
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, Math.min(100, value)));
}

/** Convierte la posición vertical del pad en intensidad: arriba = fuerte. */
export function intensityFromY(y: number, height: number): number {
  'worklet';
  if (!Number.isFinite(height) || height <= 0) return 0;
  return clampIntensity(100 - (y / height) * 100);
}
