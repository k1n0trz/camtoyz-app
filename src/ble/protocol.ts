/**
 * Protocolo BLE Camtoyz — derivado del análisis del APK OmniRemote (app-service.js / bluetooth.js).
 *
 * ⚠️ VALORES A CONFIRMAR CON SNIFFING REAL (ver docs/BLE_PROTOCOL.md):
 *   Los UUID están confirmados en el bundle del APK. El FORMATO EXACTO de bytes por nivel
 *   de vibración debe capturarse con el bullet físico + nRF Connect antes de cerrar este archivo.
 *
 * UUID observados en el APK:
 *   Service   0000FFE0-0000-1000-8000-00805F9B34FB  (write de comandos de vibración)
 *   Service   0000FFFE-0000-1000-8000-00805F9B34FB  (handshake / init observado en connectingDevices)
 * Estos son módulos serie-BLE genéricos (tipo HM-10/JDY). La característica de escritura
 * Dentro de FFE0, el APK usa FFE2 para comandos, FFE3 para init y FFE4 para notify.
 */

export const BLE = {
  serviceCommand: '0000FFE0-0000-1000-8000-00805F9B34FB',
  serviceInit: '0000FFFE-0000-1000-8000-00805F9B34FB',
  // Confirmadas en common/utils/bluetooth.js del APK legacy:
  characteristicCommand: '0000FFE2-0000-1000-8000-00805F9B34FB',
  characteristicInit: '0000FFE3-0000-1000-8000-00805F9B34FB',
  characteristicNotify: '0000FFE4-0000-1000-8000-00805F9B34FB',
  // Nombres de dispositivo conocidos para filtrar el escaneo:
  nameHints: ['LHD BLE', 'DSJM', 'HyperBullet', 'Duo Egg', 'CAMTOYZ'],
  // El APK legacy recibía esta tabla desde su catálogo remoto.
  nameAliases: { LY379A: 'HyperBullet' } as Readonly<Record<string, string>>,
  serviceHints: ['ACAB'],
} as const;

/**
 * OmniRemote interpreta las notificaciones FFE4 `66 03 XX` como batería.
 * XX es un byte porcentual y el cliente legacy limita valores anómalos a 100.
 */
export function parseBatteryNotification(bytes: Uint8Array): number | undefined {
  if (bytes.length < 3 || bytes[0] !== 0x66 || bytes[1] !== 0x03) return undefined;
  return Math.min(bytes[2], 100);
}

export interface ChannelCapabilities {
  intensityLevels: number;
  patternCount: number;
}

export interface ProtocolCapabilities {
  channels: ChannelCapabilities[];
}

export interface PatternChannelState {
  intensity: number;
  pattern: number;
}

const COMMAND_HEADER = 0x89;
const COMMAND_CONTINUOUS = 0x04;
const COMMAND_PATTERN = 0x05;
const PATTERN_INTENSITY_MAX = 10;

/** FFE4 `66 01 LL ...`: LL bytes, organizados en pares por canal. */
export function parseCapabilitiesNotification(
  bytes: Uint8Array,
): ProtocolCapabilities | undefined {
  if (bytes.length < 5 || bytes[0] !== 0x66 || bytes[1] !== 0x01) return undefined;

  const payloadLength = bytes[2];
  if (payloadLength === 0 || payloadLength % 2 !== 0 || bytes.length < 3 + payloadLength) {
    return undefined;
  }

  const channels: ChannelCapabilities[] = [];
  for (let offset = 3; offset < 3 + payloadLength; offset += 2) {
    channels.push({ intensityLevels: bytes[offset], patternCount: bytes[offset + 1] });
  }
  return { channels };
}

function assertChannelCount(channelCount: number, bytesPerChannel: number): void {
  if (
    !Number.isInteger(channelCount) ||
    channelCount < 1 ||
    channelCount * bytesPerChannel > 0xff
  ) {
    throw new RangeError('La cantidad de canales BLE no es válida.');
  }
}

/** Modo continuo legacy: `89 04 N VV...`, con VV en rango 0..255. */
export function buildIntensityCommand(
  intensity0to100: number,
  channelCount: number,
): Uint8Array {
  assertChannelCount(channelCount, 1);
  if (!Number.isFinite(intensity0to100)) {
    throw new RangeError('La intensidad continua debe ser un número finito.');
  }
  const clamped = Math.max(0, Math.min(100, intensity0to100));
  const value = Math.round((clamped / 100) * 0xff);
  return new Uint8Array([
    COMMAND_HEADER,
    COMMAND_CONTINUOUS,
    channelCount,
    ...Array(channelCount).fill(value),
  ]);
}

/** Modo patrón legacy: `89 05 2N (intensidad, patrón)...`. */
export function buildPatternCommand(channels: readonly PatternChannelState[]): Uint8Array {
  assertChannelCount(channels.length, 2);
  const payload: number[] = [];

  for (const channel of channels) {
    if (
      !Number.isInteger(channel.intensity) ||
      channel.intensity < 0 ||
      channel.intensity > PATTERN_INTENSITY_MAX
    ) {
      throw new RangeError('La intensidad discreta debe estar entre 0 y 10.');
    }
    if (!Number.isInteger(channel.pattern) || channel.pattern < 0 || channel.pattern > 0xff) {
      throw new RangeError('El índice de patrón debe estar entre 0 y 255.');
    }
    payload.push(channel.intensity, channel.pattern);
  }

  return new Uint8Array([
    COMMAND_HEADER,
    COMMAND_PATTERN,
    payload.length,
    ...payload,
  ]);
}

/** Stop global para el modo continuo. Para emergencia se combina con `buildPatternStopCommand`. */
export function stopCommand(channelCount: number): Uint8Array {
  return buildIntensityCommand(0, channelCount);
}

/** Stop explícito del modo patrón, conservando una intensidad mínima inocua. */
export function buildPatternStopCommand(channelCount: number): Uint8Array {
  assertChannelCount(channelCount, 2);
  return buildPatternCommand(
    Array.from({ length: channelCount }, () => ({ intensity: 1, pattern: 0 })),
  );
}
