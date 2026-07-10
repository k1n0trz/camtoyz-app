/**
 * BleManager — capa de sesión BLE robusta. Corazón de la mejora sobre OmniRemote.
 *
 * Defecto #1 de la app actual: se desconecta fácil. Causas identificadas en el APK:
 *   - Sin auto-reconexión (solo un console.log en onBLEConnectionStateChange).
 *   - Sin negociación de MTU (writes de comandos pueden fallar de forma intermitente).
 *   - El adapter se abre/cierra por pantalla en vez de mantener una sesión central.
 *
 * Esta clase centraliza la conexión (singleton), reconecta con backoff, negocia MTU,
 * y expone un stream de estado para toda la app. Codex: completar los TODO usando
 * react-native-ble-plx (ver docs/BLE_PROTOCOL.md).
 */
import { buildIntensityCommand, buildPatternCommand, stopCommand } from './protocol';

export type BleConnectionState =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export interface BleDevice {
  id: string;
  name: string;
  rssi?: number;
  battery?: number; // % — el diseño muestra batería en dashboard; conservar.
}

type Listener = (state: BleConnectionState, device?: BleDevice) => void;

const RECONNECT_BACKOFF_MS = [500, 1000, 2000, 4000, 8000]; // backoff exponencial acotado
const TARGET_MTU = 185; // pedir MTU alto; el firmware puede degradar a 23

export class BleManager {
  private static _instance: BleManager;
  static get shared() {
    return (this._instance ??= new BleManager());
  }

  private state: BleConnectionState = 'idle';
  private device?: BleDevice;
  private listeners = new Set<Listener>();
  private reconnectAttempt = 0;
  private intentionalDisconnect = false;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state, this.device);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn(this.state, this.device);
  }
  private setState(s: BleConnectionState) {
    this.state = s;
    this.emit();
  }

  // --- API pública ---------------------------------------------------------

  async scan(_onFound: (d: BleDevice) => void): Promise<void> {
    this.setState('scanning');
    // TODO(codex): manager.startDeviceScan([BLE.serviceCommand], null, cb)
    // Filtrar por BLE.nameHints. Auto-stop a los 30s (el diseño lo indica en 02a).
  }

  async connect(deviceId: string): Promise<void> {
    this.intentionalDisconnect = false;
    this.setState('connecting');
    // TODO(codex):
    //   1. device = await manager.connectToDevice(deviceId, { requestMTU: TARGET_MTU })
    //   2. await device.discoverAllServicesAndCharacteristics()
    //   3. resolver characteristicWrite (BLE.characteristicWriteFallback si no aparece)
    //   4. device.onDisconnected(() => this.handleUnexpectedDisconnect())
    //   5. suscribir batería si el firmware la expone; si no, leer periódicamente.
    this.reconnectAttempt = 0;
    this.setState('connected');
    void TARGET_MTU;
  }

  private async handleUnexpectedDisconnect() {
    if (this.intentionalDisconnect) {
      this.setState('disconnected');
      return;
    }
    // Reconexión automática con backoff — el diseño 09a muestra "Reconectando…" con botón visible.
    this.setState('reconnecting');
    const delay = RECONNECT_BACKOFF_MS[Math.min(this.reconnectAttempt, RECONNECT_BACKOFF_MS.length - 1)];
    this.reconnectAttempt++;
    setTimeout(() => {
      if (this.device) void this.connect(this.device.id);
    }, delay);
  }

  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    // TODO(codex): await manager.cancelDeviceConnection(this.device.id)
    this.setState('disconnected');
  }

  // --- Escritura de comandos (throttle para el pad de gesto en el hook) --------

  async setIntensity(pct: number): Promise<void> {
    return this.write(buildIntensityCommand(pct));
  }
  async setPattern(index: number): Promise<void> {
    return this.write(buildPatternCommand(index));
  }
  async stop(): Promise<void> {
    return this.write(stopCommand());
  }

  private async write(_bytes: Uint8Array): Promise<void> {
    if (this.state !== 'connected') return; // no encolar contra dispositivo caído
    // TODO(codex): writeCharacteristicWithoutResponse para baja latencia (gesto).
    // Base64-encode bytes. Capturar errores -> handleUnexpectedDisconnect().
  }

  get currentState() {
    return this.state;
  }
  get currentDevice() {
    return this.device;
  }
}

export const ble = BleManager.shared;
