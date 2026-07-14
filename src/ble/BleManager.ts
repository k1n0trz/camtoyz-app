import { AppState, Platform } from 'react-native';
import {
  BleManager as NativeBleManager,
  type Characteristic,
  type Device,
  type Subscription,
} from 'react-native-ble-plx';

import {
  BLE,
  buildIntensityCommand,
  buildPatternCommand,
  buildPatternStopCommand,
  parseBatteryNotification,
  parseCapabilitiesNotification,
  stopCommand,
  type PatternChannelState,
  type ProtocolCapabilities,
} from './protocol';
import { requestBlePermissions } from './permissions';

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
  rawName?: string;
  rssi?: number;
  battery?: number;
  channelCount?: number;
  patternCount?: number;
}

export interface BleSnapshot {
  state: BleConnectionState;
  device?: BleDevice;
  activePattern?: number;
  error?: string;
}

type Listener = (snapshot: BleSnapshot) => void;

const RECONNECT_BACKOFF_MS = [500, 1000, 2000, 4000, 8000];
const TARGET_MTU = 185;
const SCAN_TIMEOUT_MS = 30_000;
const CAPABILITIES_TIMEOUT_MS = 1_500;
const STOP_SETTLE_MS = 100;
const BATTERY_SERVICE = '0000180F-0000-1000-8000-00805F9B34FB';
const BATTERY_LEVEL = '00002A19-0000-1000-8000-00805F9B34FB';
const LHD_SIGNATURE = new Uint8Array([0x4c, 0x48, 0x44]);

interface DeviceIdentity {
  matched: boolean;
  name: string;
  rawName?: string;
  source?: 'name' | 'service' | 'lhd-signature';
}

function base64ToBytes(value: string | null | undefined): Uint8Array {
  if (!value) return new Uint8Array();

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const result: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const character of value.replace(/\s/g, '')) {
    if (character === '=') break;
    const index = alphabet.indexOf(character);
    if (index < 0) continue;

    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      result.push((buffer >> bits) & 0xff);
      buffer &= bits === 0 ? 0 : (1 << bits) - 1;
    }
  }

  return Uint8Array.from(result);
}

function containsBytes(haystack: Uint8Array, needle: Uint8Array): boolean {
  if (needle.length === 0 || haystack.length < needle.length) return false;
  for (let offset = 0; offset <= haystack.length - needle.length; offset += 1) {
    let matches = true;
    for (let index = 0; index < needle.length; index += 1) {
      if (haystack[offset + index] !== needle[index]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

function identifyDevice(device: Device): DeviceIdentity {
  const rawName = device.localName ?? device.name ?? undefined;
  const normalizedName = rawName?.toLowerCase() ?? '';
  const alias = Object.entries(BLE.nameAliases).find(
    ([advertisedName]) => normalizedName === advertisedName.toLowerCase(),
  )?.[1];
  const knownName =
    Boolean(alias) || BLE.nameHints.some((hint) => normalizedName.includes(hint.toLowerCase()));
  const knownService = device.serviceUUIDs?.some((uuid) =>
    BLE.serviceHints.some((hint) => uuid.toUpperCase().includes(hint)),
  );
  const hasLhdSignature =
    containsBytes(base64ToBytes(device.rawScanRecord), LHD_SIGNATURE) ||
    containsBytes(base64ToBytes(device.manufacturerData), LHD_SIGNATURE);

  const source = hasLhdSignature
    ? 'lhd-signature'
    : knownService
      ? 'service'
      : knownName
        ? 'name'
        : undefined;

  let name = alias ?? rawName ?? 'Dispositivo Camtoyz';
  if (!alias && normalizedName.includes('duo egg')) {
    name = 'Duo Egg';
  } else if (!alias && (normalizedName.includes('hyperbullet') || hasLhdSignature)) {
    // OmniRemote obtiene este alias de un catálogo remoto; la firma LHD es la
    // identificación estable que expone el HyperBullet físico probado aquí.
    name = 'HyperBullet';
  }

  return { matched: Boolean(source), name, rawName, source };
}

function toPublicDevice(device: Device, battery?: number): BleDevice {
  const identity = identifyDevice(device);
  return {
    id: device.id,
    name: identity.name,
    rawName: identity.rawName,
    rssi: device.rssi ?? undefined,
    battery,
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const block = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);

    result += alphabet[(block >> 18) & 63];
    result += alphabet[(block >> 12) & 63];
    result += second === undefined ? '=' : alphabet[(block >> 6) & 63];
    result += third === undefined ? '=' : alphabet[block & 63];
  }

  return result;
}

function firstByteFromBase64(value: string | null): number | undefined {
  return base64ToBytes(value)[0];
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'No fue posible completar la operación Bluetooth.';
}

export class BleManager {
  private static _instance: BleManager;

  static get shared() {
    return (this._instance ??= new BleManager());
  }

  private readonly native = new NativeBleManager();
  private state: BleConnectionState = 'idle';
  private device?: BleDevice;
  private nativeDevice?: Device;
  private writeCharacteristic?: Characteristic;
  private listeners = new Set<Listener>();
  private disconnectSubscription?: Subscription;
  private batterySubscription?: Subscription;
  private protocolSubscription?: Subscription;
  private scanTimer?: ReturnType<typeof setTimeout>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempt = 0;
  private intentionalDisconnect = false;
  private lastError?: string;
  private capabilities?: ProtocolCapabilities;
  private patternChannels: PatternChannelState[] = [];
  private activePattern?: number;
  private capabilityResolvers = new Set<() => void>();

  private constructor() {
    AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && this.state === 'connected') {
        void this.emergencyStop().catch(() => undefined);
      }
    });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const snapshot = this.snapshot;
    for (const listener of this.listeners) listener(snapshot);
  }

  private setState(state: BleConnectionState, error?: string) {
    this.state = state;
    this.lastError = error;
    this.emit();
  }

  private updateDevice(patch: Partial<BleDevice>) {
    if (!this.device) return;
    this.device = { ...this.device, ...patch };
    this.emit();
  }

  private applyCapabilities(capabilities: ProtocolCapabilities) {
    this.capabilities = capabilities;
    this.patternChannels = capabilities.channels.map(
      (_, index) => this.patternChannels[index] ?? { intensity: 1, pattern: 0 },
    );
    this.updateDevice({
      channelCount: capabilities.channels.length,
      patternCount: capabilities.channels[0]?.patternCount,
    });
    for (const resolve of this.capabilityResolvers) resolve();
    this.capabilityResolvers.clear();
  }

  private async waitForCapabilities(): Promise<void> {
    if (this.capabilities) return;

    await new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timeout);
        this.capabilityResolvers.delete(done);
        resolve();
      };
      const timeout = setTimeout(done, CAPABILITIES_TIMEOUT_MS);
      this.capabilityResolvers.add(done);
    });
  }

  private requireCapabilities(): ProtocolCapabilities {
    if (!this.capabilities?.channels.length) {
      throw new Error('El dispositivo aún no ha informado sus capacidades de control.');
    }
    return this.capabilities;
  }

  private resetProtocolState() {
    this.capabilities = undefined;
    this.patternChannels = [];
    this.activePattern = undefined;
    for (const resolve of this.capabilityResolvers) resolve();
    this.capabilityResolvers.clear();
  }

  async scan(onFound: (device: BleDevice) => void): Promise<void> {
    await requestBlePermissions();
    await this.waitUntilPoweredOn();
    await this.stopScan();

    if (await this.recoverConnectedDevice(onFound)) return;

    const found = new Set<string>();
    this.setState('scanning');

    await this.native.startDeviceScan(null, null, (error, scannedDevice) => {
      if (error) {
        void this.stopScan();
        this.setState('error', error.message);
        return;
      }
      if (!scannedDevice || !this.isCamtoyzDevice(scannedDevice)) return;

      found.add(scannedDevice.id);
      onFound(toPublicDevice(scannedDevice));
    });

    this.scanTimer = setTimeout(() => {
      void this.stopScan();
      if (found.size === 0) {
        this.setState('error', 'No se encontró ningún dispositivo Camtoyz.');
      }
    }, SCAN_TIMEOUT_MS);
  }

  async stopScan(): Promise<void> {
    if (this.scanTimer) clearTimeout(this.scanTimer);
    this.scanTimer = undefined;
    await this.native.stopDeviceScan().catch(() => undefined);
    if (this.state === 'scanning') {
      this.setState(this.device ? 'connected' : 'idle');
    }
  }

  async connect(deviceId: string): Promise<void> {
    this.intentionalDisconnect = false;
    this.reconnectAttempt = 0;
    await this.connectInternal(deviceId, false);
  }

  async retryConnection(): Promise<void> {
    if (!this.device) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.intentionalDisconnect = false;
    await this.connectInternal(this.device.id, true);
  }

  private async connectInternal(deviceId: string, reconnecting: boolean): Promise<void> {
    await requestBlePermissions();
    await this.waitUntilPoweredOn();
    await this.stopScan();
    this.setState(reconnecting ? 'reconnecting' : 'connecting');

    try {
      const connected = await this.native.connectToDevice(deviceId, {
        autoConnect: false,
        requestMTU: Platform.OS === 'android' ? TARGET_MTU : undefined,
      });
      const discovered = await connected.discoverAllServicesAndCharacteristics();

      await this.activateConnectedDevice(discovered);
      this.reconnectAttempt = 0;
      this.setState('connected');
    } catch (error) {
      const message = errorMessage(error);
      await this.native.cancelDeviceConnection(deviceId).catch(() => undefined);
      this.nativeDevice = undefined;
      this.writeCharacteristic = undefined;
      this.resetProtocolState();
      if (reconnecting) {
        this.scheduleReconnect();
      } else {
        this.setState('error', message);
        throw error;
      }
    }
  }

  private async recoverConnectedDevice(onFound: (device: BleDevice) => void): Promise<boolean> {
    if (this.nativeDevice && this.device) {
      const currentStillConnected = await this.native
        .isDeviceConnected(this.nativeDevice.id)
        .catch(() => false);
      if (currentStillConnected) {
        onFound(this.device);
        this.setState('connected');
        return true;
      }
    }

    const connected = await this.native.connectedDevices([BLE.serviceCommand]).catch(() => []);

    for (const candidate of connected) {
      if (!this.isCamtoyzDevice(candidate)) continue;
      const isConnected = await this.native.isDeviceConnected(candidate.id).catch(() => false);
      if (!isConnected) continue;

      try {
        const discovered = await candidate.discoverAllServicesAndCharacteristics();
        await this.activateConnectedDevice(discovered);
        const publicDevice = this.device ?? toPublicDevice(discovered);
        onFound(publicDevice);
        this.reconnectAttempt = 0;
        this.setState('connected');
        return true;
      } catch {
        await this.native.cancelDeviceConnection(candidate.id).catch(() => undefined);
      }
    }

    return false;
  }

  private async activateConnectedDevice(device: Device): Promise<void> {
    this.resetProtocolState();
    this.nativeDevice = device;
    this.device = toPublicDevice(device, this.device?.battery);
    this.writeCharacteristic = await this.resolveWriteCharacteristic(device);
    this.attachDisconnectListener(device.id);
    await this.initializeProtocol(device);
    await this.attachBatteryMonitor(device);
  }

  private async resolveWriteCharacteristic(device: Device): Promise<Characteristic> {
    const characteristics = await device.characteristicsForService(BLE.serviceCommand);
    const commandUuid = BLE.characteristicCommand.toLowerCase();
    const writable = characteristics.find(
      (characteristic) =>
        characteristic.uuid.toLowerCase() === commandUuid &&
        (characteristic.isWritableWithoutResponse || characteristic.isWritableWithResponse),
    );

    if (!writable) {
      throw new Error('El dispositivo no expone la característica de comandos FFE2.');
    }
    return writable;
  }

  private attachDisconnectListener(deviceId: string) {
    this.disconnectSubscription?.remove();
    this.disconnectSubscription = this.native.onDeviceDisconnected(deviceId, () => {
      this.writeCharacteristic = undefined;
      this.batterySubscription?.remove();
      this.batterySubscription = undefined;
      this.protocolSubscription?.remove();
      this.protocolSubscription = undefined;
      this.resetProtocolState();
      if (this.intentionalDisconnect) {
        this.setState('disconnected');
        return;
      }
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect() {
    if (!this.device || this.intentionalDisconnect) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.setState('reconnecting');
    const delay = RECONNECT_BACKOFF_MS[
      Math.min(this.reconnectAttempt, RECONNECT_BACKOFF_MS.length - 1)
    ];
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (this.device) void this.connectInternal(this.device.id, true);
    }, delay);
  }

  private async attachBatteryMonitor(device: Device) {
    this.batterySubscription?.remove();
    this.batterySubscription = undefined;

    try {
      const initial = await device.readCharacteristicForService(BATTERY_SERVICE, BATTERY_LEVEL);
      this.updateDevice({ battery: firstByteFromBase64(initial.value) });
      this.batterySubscription = device.monitorCharacteristicForService(
        BATTERY_SERVICE,
        BATTERY_LEVEL,
        (error, characteristic) => {
          if (!error && characteristic) {
            this.updateDevice({ battery: firstByteFromBase64(characteristic.value) });
          }
        },
      );
    } catch {
      // Algunos firmwares Camtoyz no exponen Battery Service. No bloquea la conexión.
    }
  }

  private async initializeProtocol(device: Device) {
    try {
      const characteristics = await device.characteristicsForService(BLE.serviceCommand);
      const init = characteristics.find(
        (characteristic) =>
          characteristic.uuid.toLowerCase() === BLE.characteristicInit.toLowerCase(),
      );
      const notify = characteristics.find(
        (characteristic) =>
          characteristic.uuid.toLowerCase() === BLE.characteristicNotify.toLowerCase(),
      );

      this.protocolSubscription?.remove();
      if (notify?.isNotifiable || notify?.isIndicatable) {
        this.protocolSubscription = notify.monitor((error, characteristic) => {
          if (error || !characteristic?.value) return;
          const bytes = base64ToBytes(characteristic.value);
          const capabilities = parseCapabilitiesNotification(bytes);
          if (capabilities) this.applyCapabilities(capabilities);
          const battery = parseBatteryNotification(bytes);
          if (battery !== undefined) this.updateDevice({ battery });
        });
      }

      if (init?.isWritableWithoutResponse || init?.isWritableWithResponse) {
        const write = (bytes: Uint8Array) =>
          init.isWritableWithoutResponse
            ? init.writeWithoutResponse(bytesToBase64(bytes))
            : init.writeWithResponse(bytesToBase64(bytes));
        await new Promise((resolve) => setTimeout(resolve, 100));
        await write(new Uint8Array([0x88, 0x00]));
        await new Promise((resolve) => setTimeout(resolve, 100));
        await write(new Uint8Array([0x88, 0x01]));
      }
      await this.waitForCapabilities();
    } catch {
      // El handshake aporta capacidades, pero no debe impedir usar firmwares antiguos.
    }
  }

  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    await this.stopScan();

    if (this.state === 'connected') {
      await this.emergencyStop().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, STOP_SETTLE_MS));
    }

    const deviceId = this.nativeDevice?.id ?? this.device?.id;
    if (deviceId) {
      await this.native.cancelDeviceConnection(deviceId).catch(() => undefined);
    }

    this.disconnectSubscription?.remove();
    this.disconnectSubscription = undefined;
    this.batterySubscription?.remove();
    this.batterySubscription = undefined;
    this.protocolSubscription?.remove();
    this.protocolSubscription = undefined;
    this.nativeDevice = undefined;
    this.writeCharacteristic = undefined;
    this.resetProtocolState();
    this.setState('disconnected');
  }

  async setIntensity(percent: number): Promise<void> {
    if (percent <= 0) {
      await this.stop();
      return;
    }

    const capabilities = this.requireCapabilities();
    await this.write(buildIntensityCommand(percent, capabilities.channels.length));
    this.activePattern = undefined;
    this.emit();
  }

  async setPattern(index: number): Promise<void> {
    const capabilities = this.requireCapabilities();
    const patternCount = capabilities.channels[0]?.patternCount ?? 0;
    if (!Number.isInteger(index) || index < 1 || index > patternCount) {
      throw new RangeError(`El dispositivo admite patrones entre P1 y P${patternCount}.`);
    }

    const nextChannels = capabilities.channels.map((_, channelIndex) => {
      const current = this.patternChannels[channelIndex] ?? { intensity: 1, pattern: 0 };
      return channelIndex === 0 ? { ...current, pattern: index } : current;
    });
    await this.write(buildPatternCommand(nextChannels));
    this.patternChannels = nextChannels;
    this.activePattern = index;
    this.emit();
  }

  async stop(): Promise<void> {
    await this.emergencyStop();
  }

  private async emergencyStop(): Promise<void> {
    const capabilities = this.capabilities;
    this.activePattern = undefined;

    if (!capabilities?.channels.length || this.state !== 'connected' || !this.writeCharacteristic) {
      this.emit();
      return;
    }

    const channelCount = capabilities.channels.length;
    let firstError: unknown;
    try {
      await this.write(stopCommand(channelCount));
    } catch (error) {
      firstError = error;
    }
    try {
      await this.write(buildPatternStopCommand(channelCount));
    } catch (error) {
      firstError ??= error;
    }

    this.patternChannels = capabilities.channels.map(() => ({ intensity: 1, pattern: 0 }));
    this.emit();
    if (firstError) throw firstError;
  }

  private async write(bytes: Uint8Array): Promise<void> {
    if (this.state !== 'connected' || !this.writeCharacteristic) {
      throw new Error('No hay un dispositivo BLE conectado.');
    }

    try {
      const value = bytesToBase64(bytes);
      if (__DEV__) {
        console.info(
          '[Camtoyz BLE] FFE2',
          Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(' '),
        );
      }
      if (this.writeCharacteristic.isWritableWithoutResponse) {
        await this.writeCharacteristic.writeWithoutResponse(value);
      } else {
        await this.writeCharacteristic.writeWithResponse(value);
      }
    } catch (error) {
      this.lastError = errorMessage(error);
      this.scheduleReconnect();
      throw error;
    }
  }

  private isCamtoyzDevice(device: Device): boolean {
    return identifyDevice(device).matched;
  }

  private async waitUntilPoweredOn(): Promise<void> {
    const current = await this.native.state();
    if (current === 'PoweredOn') return;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        subscription.remove();
        reject(new Error('Activa Bluetooth para buscar dispositivos Camtoyz.'));
      }, 10_000);
      const subscription = this.native.onStateChange((state) => {
        if (state !== 'PoweredOn') return;
        clearTimeout(timeout);
        subscription.remove();
        resolve();
      }, true);
    });
  }

  get snapshot(): BleSnapshot {
    return {
      state: this.state,
      device: this.device,
      activePattern: this.activePattern,
      error: this.lastError,
    };
  }
}

const globalBle = globalThis as typeof globalThis & { __camtoyzBleManager?: BleManager };

// Mantiene un único cliente nativo incluso durante Fast Refresh, evitando GATT huérfanos.
export const ble = (globalBle.__camtoyzBleManager ??= BleManager.shared);
