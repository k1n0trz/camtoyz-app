import { clampPercent } from './metering';
import type { PlaybackSample } from './playbackCapture';

export interface DetectedBeat {
  intensity: number;
  durationMs: number;
  strength: number;
}

/** Detector de ataques de graves con umbral adaptativo para música comprimida. */
export class AdaptiveBeatDetector {
  private bassBaseline?: number;
  private lastBeatAt = 0;
  private frames = 0;
  private silentFrames = 0;

  reset(): void {
    this.bassBaseline = undefined;
    this.lastBeatAt = 0;
    this.frames = 0;
    this.silentFrames = 0;
  }

  process(sample: PlaybackSample, maximum: number, now = Date.now()): DetectedBeat | undefined {
    const bass = sample.bassDb;
    if (!Number.isFinite(bass) || !Number.isFinite(sample.db)) return undefined;
    // Conserva la referencia durante pausas cortas entre golpes. Una pausa
    // sostenida vuelve a calibrar el siguiente inicio.
    if (sample.db < -55) {
      this.silentFrames += 1;
      if (this.silentFrames >= 20) {
        this.bassBaseline = undefined;
        this.frames = 0;
      }
      return undefined;
    }
    this.silentFrames = 0;
    if (this.bassBaseline === undefined) {
      this.bassBaseline = bass;
      this.frames = 1;
      return undefined;
    }
    const baseline = this.bassBaseline;
    const riseDb = bass - baseline;
    // Sigue lentamente las subidas y más rápido las bajadas para conservar ataques.
    const alpha = bass > baseline ? 0.045 : 0.14;
    this.bassBaseline += (bass - baseline) * alpha;
    this.frames += 1;
    const strength = clampPercent(((riseDb - 3.8) / 13) * 100);
    // Una ventana corta conserva golpes rápidos sin convertir el motor en una
    // vibración continua. Los ataques fuertes admiten un intervalo algo menor.
    const minimumGap = strength >= 65 ? 175 : strength >= 35 ? 205 : 235;
    if (this.frames < 2 || riseDb < 3.8 || now - this.lastBeatAt < minimumGap) return undefined;

    this.lastBeatAt = now;
    const floor = Math.min(30, maximum);
    const shapedStrength = Math.pow(strength / 100, 1.25);
    const intensity = clampPercent(floor + shapedStrength * (maximum - floor));
    return { intensity, strength, durationMs: 52 + Math.round(strength * 0.34) };
  }
}
