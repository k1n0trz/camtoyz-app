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
 * dentro de FFE0 suele ser FFE1 — CONFIRMAR por descubrimiento en tiempo de conexión.
 */

export const BLE = {
  serviceCommand: '0000FFE0-0000-1000-8000-00805F9B34FB',
  serviceInit: '0000FFFE-0000-1000-8000-00805F9B34FB',
  // characteristicWrite: se resuelve por descubrimiento; fallback típico:
  characteristicWriteFallback: '0000FFE1-0000-1000-8000-00805F9B34FB',
  // Nombres de dispositivo conocidos para filtrar el escaneo:
  nameHints: ['HyperBullet', 'Duo Egg', 'CAMTOYZ'],
} as const;

/**
 * Comando de intensidad. TODO(protocol): confirmar rango real del firmware.
 * El diseño expone "P1..Pn" (patrones) + intensidad continua (gesto/sonido/música 0-100%).
 * Hipótesis de trabajo: 1 byte de intensidad 0..0xFF. Se ajusta tras el sniffing.
 */
export function buildIntensityCommand(intensity0to100: number): Uint8Array {
  const clamped = Math.max(0, Math.min(100, Math.round(intensity0to100)));
  const byte = Math.round((clamped / 100) * 0xff);
  // Placeholder de framing — reemplazar por el frame real capturado (posible header/checksum).
  return new Uint8Array([byte]);
}

/** Patrón por índice (P1..Pn). El mapeo real de bytes se completa tras sniffing. */
export function buildPatternCommand(patternIndex: number): Uint8Array {
  return new Uint8Array([0x01, patternIndex & 0xff]);
}

export function stopCommand(): Uint8Array {
  return new Uint8Array([0x00]);
}
