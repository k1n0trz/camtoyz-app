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
    // Conserva la referencia durante las pausas cortas entre golpes. Solo una
    // pausa real (aprox. dos segundos) vuelve a calibrar el siguiente inicio.
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
    // Limita el ritmo a golpes perceptiblemente separados. El motor conserva inercia
    // durante unos milisegundos y frecuencias mayores se sienten como vibración continua.
    if (this.frames < 2 || riseDb < 4.5 || now - this.lastBeatAt < 360) return undefined;

    this.lastBeatAt = now;
    const strength = clampPercent(((riseDb - 4.5) / 14) * 100);
    const floor = Math.min(38, maximum);
    const shapedStrength = Math.pow(strength / 100, 1.35);
    const intensity = clampPercent(floor + shapedStrength * (maximum - floor));
    return { intensity, strength, durationMs: 70 + Math.round(strength * 0.25) };
  }
}
