export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, Math.min(100, value)));
}

/** Convierte dBFS de `expo-audio` a una señal de UI 0..100. */
export function meteringToPercent(metering?: number): number {
  if (metering === undefined) return 0;
  return clampPercent(((metering + 60) / 60) * 100);
}

/** Una sensibilidad alta responde a sonidos más suaves. */
export function soundToIntensity(level: number, sensitivity: number): number {
  const profile = sensitivity >= 80
    ? { threshold: 3, minimumIntensity: 85 }
    : sensitivity >= 50
      ? { threshold: 12, minimumIntensity: 65 }
      : { threshold: 25, minimumIntensity: 35 };
  const { threshold, minimumIntensity } = profile;
  if (level <= threshold) return 0;
  // HyperBullet no responde de forma perceptible a los primeros porcentajes.
  // Cada perfil combina su umbral con una potencia mínima diferenciada.
  return clampPercent(
    minimumIntensity + ((level - threshold) / Math.max(1, 100 - threshold)) * (100 - minimumIntensity),
  );
}
