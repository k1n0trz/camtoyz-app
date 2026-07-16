import { AppState, Platform } from 'react-native';
import {
  BleManager as NativeBleManager,
  type Characteristic,
  type Device,
  type Subscription,
} from 'react-native-ble-plx';

import {
  BLE,
  buildIntensityChannelsCommand,
  buildPatternCommand,
  buildPatternStopCommand,
  parseBatteryNotification,
  parseCapabilitiesNotification,
  stopCommand,
  type PatternChannelState,
  type MotorTarget,
  type ProtocolCapabilities,
} from './protocol';
import { resolveCatalogDeviceName } from './deviceCatalog';
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
  /** Nombre comercial visible; el identificador BLE permanece interno. */
  name: string;
  rawName?: string;
  rssi?: number;
  battery?: number;
  channelCount?: number;
  patternCount?: number;
}

export interface BleSnapshot {
  state: BleConnectionState;
  /** Dispositivo sobre el que actúan los controles si sincronizar está apagado. */
  device?: BleDevice;
  devices: BleDevice[];
  activeDeviceId?: string;
  activePattern?: number;
  motorTarget: MotorTarget;
  syncEnabled: boolean;
  isScanning: boolean;
  error?: string;
}

interface ConnectedDevice {
  id: string;
  device: BleDevice;
  nativeDevice: Device;
  writeCharacteristic: Characteristic;
  disconnectSubscription?: Subscription;
  batterySubscription?: Subscription;
  protocolSubscription?: Subscription;
  capabilities?: ProtocolCapabilities;
  patternChannels: PatternChannelState[];
  continuousChannels: number[];
  activePattern?: number;
  capabilityResolvers: Set<() => void>;
}

interface DeviceIdentity {
  matched: boolean;
  name: string;
  rawName?: string;
}

type Listener = (snapshot: BleSnapshot) => void;

const TARGET_MTU = 185;
const SCAN_TIMEOUT_MS = 30_000;
const CAPABILITIES_TIMEOUT_MS = 1_500;
const STOP_SETTLE_MS = 100;
const BATTERY_SERVICE = '0000180F-0000-1000-8000-00805F9B34FB';
const BATTERY_LEVEL = '00002A19-0000-1000-8000-00805F9B34FB';
const LHD_SIGNATURE = new Uint8Array([0x4c, 0x48, 0x44]);

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

function containsBytes(haystack: Uint8Array, needle: Uint8Array): boolean {
  if (!needle.length || haystack.length < needle.length) return false;
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

function firstByteFromBase64(value: string | null | undefined): number | undefined {
  return base64ToBytes(value)[0];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No fue posible completar la operación Bluetooth.';
}

function connectionErrorMessage(error: unknown): string {
  const detail = errorMessage(error);
  const normalized = detail.toLowerCase();
  if (normalized.includes('gatt') || normalized.includes('already connected') || normalized.includes('not connected') || normalized.includes('status 133')) {
    return 'No fue posible conectar. Si el dispositivo está conectado a otro celular, desconéctalo allí; después apágalo, enciéndelo y pulsa “Buscar de nuevo”.';
  }
  return 'No fue posible conectar el dispositivo. Apágalo, enciéndelo y vuelve a buscarlo.';
}

function identifyDevice(device: Device): DeviceIdentity {
  const rawName = device.localName ?? device.name ?? undefined;
  const normalizedName = rawName?.toLowerCase() ?? '';
  const catalogName = resolveCatalogDeviceName(rawName);
  const knownName = Boolean(catalogName) || BLE.nameHints.some((hint) => normalizedName.includes(hint.toLowerCase()));
  const knownService = device.serviceUUIDs?.some((uuid) => BLE.serviceHints.some((hint) => uuid.toUpperCase().includes(hint)));
  const hasLhdSignature =
    containsBytes(base64ToBytes(device.rawScanRecord), LHD_SIGNATURE) ||
    containsBytes(base64ToBytes(device.manufacturerData), LHD_SIGNATURE);

  let name = catalogName ?? rawName ?? 'Dispositivo Camtoyz';
  if (!catalogName && normalizedName.includes('duo egg')) name = 'Duo Egg';
  else if (!catalogName && normalizedName.includes('hyperbullet')) name = 'HyperBullet';

  return { matched: Boolean(knownName || knownService || hasLhdSignature), name, rawName };
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

export class BleManager {
  private static _instance: BleManager;

  static get shared(): BleManager {
    return (this._instance ??= new BleManager());
  }

  private readonly native = new NativeBleManager();
  private readonly connections = new Map<string, ConnectedDevice>();
  private readonly listeners = new Set<Listener>();
  private state: BleConnectionState = 'idle';
  private activeDeviceId?: string;
  private lastSelectedDeviceId?: string;
  private syncEnabled = false;
  private motorTarget: MotorTarget = 'all';
  private isScanning = false;
  private scanTimer?: ReturnType<typeof setTimeout>;
  private lastError?: string;

  private constructor() {
    AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && this.connections.size > 0) {
        void this.stop().catch(() => undefined);
      }
    });
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  get snapshot(): BleSnapshot {
    const active = this.activeConnection();
    return {
      state: this.state,
      device: active?.device,
      devices: [...this.connections.values()].map((connection) => connection.device),
      activeDeviceId: this.activeDeviceId,
      activePattern: active?.activePattern,
      motorTarget: this.motorTarget,
      syncEnabled: this.syncEnabled,
      isScanning: this.isScanning,
      error: this.lastError,
    };
  }

  private emit(): void {
    const snapshot = this.snapshot;
    for (const listener of this.listeners) listener(snapshot);
  }

  private setState(state: BleConnectionState, error?: string): void {
    this.state = state;
    this.lastError = error;
    this.emit();
  }

  private activeConnection(): ConnectedDevice | undefined {
    return this.activeDeviceId ? this.connections.get(this.activeDeviceId) : undefined;
  }

  private updateDevice(connection: ConnectedDevice, patch: Partial<BleDevice>): void {
    if (this.connections.get(connection.id) !== connection) return;
    connection.device = { ...connection.device, ...patch };
    this.emit();
  }

  private applyCapabilities(connection: ConnectedDevice, capabilities: ProtocolCapabilities): void {
    if (this.connections.get(connection.id) !== connection) return;
    connection.capabilities = capabilities;
    connection.patternChannels = capabilities.channels.map(
      (_, index) => connection.patternChannels[index] ?? { intensity: 1, pattern: 0 },
    );
    connection.continuousChannels = capabilities.channels.map(
      (_, index) => connection.continuousChannels[index] ?? 0,
    );
    if (typeof this.motorTarget === 'number' && this.motorTarget >= capabilities.channels.length) {
      this.motorTarget = 'all';
    }
    this.updateDevice(connection, {
      channelCount: capabilities.channels.length,
      patternCount: capabilities.channels[0]?.patternCount,
    });
    for (const resolve of connection.capabilityResolvers) resolve();
    connection.capabilityResolvers.clear();
  }

  private async waitForCapabilities(connection: ConnectedDevice): Promise<void> {
    if (connection.capabilities) return;
    await new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timeout);
        connection.capabilityResolvers.delete(done);
        resolve();
      };
      const timeout = setTimeout(done, CAPABILITIES_TIMEOUT_MS);
      connection.capabilityResolvers.add(done);
    });
  }

  private requireCapabilities(connection: ConnectedDevice): ProtocolCapabilities {
    if (!connection.capabilities?.channels.length) {
      throw new Error(`${connection.device.name} aún no ha informado sus capacidades de control.`);
    }
    return connection.capabilities;
  }

  private commandTargets(stopAll = false): ConnectedDevice[] {
    if (stopAll || this.syncEnabled) return [...this.connections.values()];
    const active = this.activeConnection();
    return active ? [active] : [];
  }

  async scan(onFound: (device: BleDevice) => void): Promise<void> {
    await requestBlePermissions();
    await this.waitUntilPoweredOn();
    await this.stopScan();

    const found = new Set<string>();
    for (const connection of this.connections.values()) {
      found.add(connection.id);
      onFound(connection.device);
    }
    await this.recoverConnectedDevices(onFound, found);

    this.isScanning = true;
    this.setState(this.connections.size > 0 ? 'connected' : 'scanning');
    this.native.startDeviceScan(null, null, (error, scannedDevice) => {
      if (error) {
        void this.stopScan();
        this.setState(this.connections.size > 0 ? 'connected' : 'error', error.message);
        return;
      }
      if (!scannedDevice || !this.isCamtoyzDevice(scannedDevice)) return;
      found.add(scannedDevice.id);
      onFound(toPublicDevice(scannedDevice));
    });

    this.scanTimer = setTimeout(() => {
      void this.stopScan().then(() => {
        if (found.size === 0 && this.connections.size === 0) {
          this.setState('error', 'No se encontró ningún dispositivo Camtoyz.');
        }
      });
    }, SCAN_TIMEOUT_MS);
  }

  async stopScan(): Promise<void> {
    if (this.scanTimer) clearTimeout(this.scanTimer);
    this.scanTimer = undefined;
    await this.native.stopDeviceScan().catch(() => undefined);
    if (!this.isScanning) return;
    this.isScanning = false;
    this.setState(this.connections.size > 0 ? 'connected' : 'idle');
  }

  async connect(deviceId: string): Promise<void> {
    this.lastSelectedDeviceId = deviceId;
    await this.connectInternal(deviceId);
  }

  async retryConnection(): Promise<void> {
    if (!this.lastSelectedDeviceId) return;
    await this.connectInternal(this.lastSelectedDeviceId);
  }

  private async connectInternal(deviceId: string): Promise<void> {
    await requestBlePermissions();
    await this.waitUntilPoweredOn();
    await this.stopScan();

    const existing = this.connections.get(deviceId);
    if (existing) {
      this.activeDeviceId = existing.id;
      this.setState('connected');
      return;
    }

    this.setState('connecting');
    try {
      const connected = await this.native.connectToDevice(deviceId, { autoConnect: false });
      const transport = Platform.OS === 'android'
        ? await connected.requestMTU(TARGET_MTU).catch(() => connected)
        : connected;
      const discovered = await transport.discoverAllServicesAndCharacteristics();
      const connection = await this.activateConnectedDevice(discovered);
      this.activeDeviceId = connection.id;
      this.lastSelectedDeviceId = connection.id;
      this.setState('connected');
    } catch (error) {
      await this.native.cancelDeviceConnection(deviceId).catch(() => undefined);
      const message = connectionErrorMessage(error);
      this.setState(this.connections.size > 0 ? 'connected' : 'error', message);
      throw new Error(message);
    }
  }

  private async recoverConnectedDevices(onFound: (device: BleDevice) => void, found: Set<string>): Promise<void> {
    const connected = await this.native.connectedDevices([BLE.serviceCommand]).catch(() => []);
    for (const candidate of connected) {
      if (!this.isCamtoyzDevice(candidate)) continue;
      const stillConnected = await this.native.isDeviceConnected(candidate.id).catch(() => false);
      if (!stillConnected) continue;
      try {
        const discovered = await candidate.discoverAllServicesAndCharacteristics();
        const connection = await this.activateConnectedDevice(discovered);
        found.add(connection.id);
        onFound(connection.device);
      } catch {
        await this.native.cancelDeviceConnection(candidate.id).catch(() => undefined);
      }
    }
  }

  private async activateConnectedDevice(device: Device): Promise<ConnectedDevice> {
    const current = this.connections.get(device.id);
    if (current) return current;

    const writeCharacteristic = await this.resolveWriteCharacteristic(device);
    const connection: ConnectedDevice = {
      id: device.id,
      device: toPublicDevice(device),
      nativeDevice: device,
      writeCharacteristic,
      patternChannels: [],
      continuousChannels: [],
      capabilityResolvers: new Set(),
    };
    this.connections.set(connection.id, connection);
    this.activeDeviceId ??= connection.id;
    this.attachDisconnectListener(connection);
    await this.initializeProtocol(connection);
    await this.attachBatteryMonitor(connection);
    return connection;
  }

  private async resolveWriteCharacteristic(device: Device): Promise<Characteristic> {
    const characteristics = await device.characteristicsForService(BLE.serviceCommand);
    const commandUuid = BLE.characteristicCommand.toLowerCase();
    const writable = characteristics.find(
      (characteristic) =>
        characteristic.uuid.toLowerCase() === commandUuid &&
        (characteristic.isWritableWithoutResponse || characteristic.isWritableWithResponse),
    );
    if (!writable) throw new Error('El dispositivo no expone la característica de comandos FFE2.');
    return writable;
  }

  private attachDisconnectListener(connection: ConnectedDevice): void {
    connection.disconnectSubscription = this.native.onDeviceDisconnected(connection.id, () => {
      this.handleDisconnected(connection.id, 'Se perdió la conexión Bluetooth. Acerca el dispositivo e inténtalo de nuevo.');
    });
  }

  private handleDisconnected(deviceId: string, error?: string): void {
    const connection = this.connections.get(deviceId);
    if (!connection) return;
    connection.disconnectSubscription?.remove();
    connection.batterySubscription?.remove();
    connection.protocolSubscription?.remove();
    for (const resolve of connection.capabilityResolvers) resolve();
    connection.capabilityResolvers.clear();
    this.connections.delete(deviceId);
    if (this.activeDeviceId === deviceId) {
      this.activeDeviceId = this.connections.keys().next().value as string | undefined;
    }
    if (this.connections.size === 0) {
      this.setState('disconnected', error);
    } else {
      this.setState('connected', error);
    }
  }

  private async attachBatteryMonitor(connection: ConnectedDevice): Promise<void> {
    try {
      const initial = await connection.nativeDevice.readCharacteristicForService(BATTERY_SERVICE, BATTERY_LEVEL);
      this.updateDevice(connection, { battery: firstByteFromBase64(initial.value) });
      connection.batterySubscription = connection.nativeDevice.monitorCharacteristicForService(
        BATTERY_SERVICE,
        BATTERY_LEVEL,
        (error, characteristic) => {
          if (!error && characteristic) this.updateDevice(connection, { battery: firstByteFromBase64(characteristic.value) });
        },
      );
    } catch {
      // Algunos firmwares no exponen Battery Service; no bloquea la conexión.
    }
  }

  private async initializeProtocol(connection: ConnectedDevice): Promise<void> {
    try {
      const characteristics = await connection.nativeDevice.characteristicsForService(BLE.serviceCommand);
      const init = characteristics.find((characteristic) => characteristic.uuid.toLowerCase() === BLE.characteristicInit.toLowerCase());
      const notify = characteristics.find((characteristic) => characteristic.uuid.toLowerCase() === BLE.characteristicNotify.toLowerCase());

      if (notify?.isNotifiable || notify?.isIndicatable) {
        connection.protocolSubscription = notify.monitor((error, characteristic) => {
          if (error || !characteristic?.value) return;
          const bytes = base64ToBytes(characteristic.value);
          const capabilities = parseCapabilitiesNotification(bytes);
          if (capabilities) this.applyCapabilities(connection, capabilities);
          const battery = parseBatteryNotification(bytes);
          if (battery !== undefined) this.updateDevice(connection, { battery });
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
      await this.waitForCapabilities(connection);
    } catch {
      // El handshake aporta capacidades, pero permite usar firmwares antiguos.
    }
  }

  async disconnect(deviceId = this.activeDeviceId): Promise<void> {
    if (!deviceId) return;
    const connection = this.connections.get(deviceId);
    if (!connection) return;
    await this.emergencyStopFor(connection).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, STOP_SETTLE_MS));
    await this.native.cancelDeviceConnection(deviceId).catch(() => undefined);
    this.handleDisconnected(deviceId);
  }

  setActiveDevice(deviceId: string): void {
    if (!this.connections.has(deviceId)) return;
    this.activeDeviceId = deviceId;
    const channelCount = this.connections.get(deviceId)?.capabilities?.channels.length ?? 1;
    if (typeof this.motorTarget === 'number' && this.motorTarget >= channelCount) {
      this.motorTarget = 'all';
    }
    this.lastError = undefined;
    this.emit();
  }

  setSyncEnabled(enabled: boolean): void {
    this.syncEnabled = enabled && this.connections.size > 1;
    this.emit();
  }

  setMotorTarget(target: MotorTarget): void {
    if (target !== 'all' && (!Number.isInteger(target) || target < 0)) return;
    const active = this.activeConnection();
    const channelCount = active?.capabilities?.channels.length ?? 1;
    if (typeof target === 'number' && target >= channelCount) return;
    this.motorTarget = target;
    if (typeof target === 'number') this.syncEnabled = false;
    if (active) active.activePattern = this.activePatternFor(active, target);
    this.emit();
  }

  async setIntensity(percent: number, target: MotorTarget = this.motorTarget): Promise<void> {
    const targets = this.commandTargets();
    if (!targets.length) throw new Error('No hay un dispositivo BLE conectado.');
    await this.forEachTarget(targets, async (connection) => {
      const capabilities = this.requireCapabilities(connection);
      const indexes = this.channelIndexes(capabilities.channels.length, target);
      const nextChannels = capabilities.channels.map(
        (_, index) => connection.continuousChannels[index] ?? 0,
      );
      for (const index of indexes) nextChannels[index] = Math.max(0, Math.min(100, percent));
      await this.write(connection, buildIntensityChannelsCommand(nextChannels));
      connection.continuousChannels = nextChannels;
      connection.activePattern = undefined;
    });
    this.emit();
  }

  async setPattern(index: number, target: MotorTarget = this.motorTarget): Promise<void> {
    const targets = this.commandTargets();
    if (!targets.length) throw new Error('No hay un dispositivo BLE conectado.');
    await this.forEachTarget(targets, async (connection) => {
      const capabilities = this.requireCapabilities(connection);
      const indexes = this.channelIndexes(capabilities.channels.length, target);
      const invalidChannel = indexes.find(
        (channelIndex) => index > (capabilities.channels[channelIndex]?.patternCount ?? 0),
      );
      if (!Number.isInteger(index) || index < 1 || invalidChannel !== undefined) {
        const patternCount = Math.min(...indexes.map(
          (channelIndex) => capabilities.channels[channelIndex]?.patternCount ?? 0,
        ));
        throw new RangeError(`${connection.device.name} admite patrones entre P1 y P${patternCount}.`);
      }
      const nextChannels = capabilities.channels.map((_, channelIndex) => {
        const current = connection.patternChannels[channelIndex] ?? { intensity: 1, pattern: 0 };
        return indexes.includes(channelIndex) ? { ...current, pattern: index } : current;
      });
      await this.write(connection, buildPatternCommand(nextChannels));
      connection.patternChannels = nextChannels;
      connection.activePattern = this.activePatternFor(connection, target);
    });
    this.emit();
  }

  async stopSelected(target: MotorTarget = this.motorTarget): Promise<void> {
    const targets = this.commandTargets();
    if (!targets.length) return;
    await this.forEachTarget(targets, async (connection) => {
      const capabilities = this.requireCapabilities(connection);
      const indexes = this.channelIndexes(capabilities.channels.length, target);
      const continuous = capabilities.channels.map(
        (_, index) => connection.continuousChannels[index] ?? 0,
      );
      for (const index of indexes) continuous[index] = 0;
      await this.write(connection, buildIntensityChannelsCommand(continuous));
      connection.continuousChannels = continuous;

      const patterns = capabilities.channels.map((_, channelIndex) => {
        const current = connection.patternChannels[channelIndex] ?? { intensity: 1, pattern: 0 };
        return indexes.includes(channelIndex) ? { intensity: 1, pattern: 0 } : current;
      });
      await this.write(connection, buildPatternCommand(patterns));
      connection.patternChannels = patterns;
      connection.activePattern = this.activePatternFor(connection, target);
    });
    this.emit();
  }

  async stop(): Promise<void> {
    await this.forEachTarget(this.commandTargets(true), (connection) => this.emergencyStopFor(connection));
    this.emit();
  }

  private async emergencyStopFor(connection: ConnectedDevice): Promise<void> {
    connection.activePattern = undefined;
    const capabilities = connection.capabilities;
    if (!capabilities?.channels.length || !this.connections.has(connection.id)) return;

    const channelCount = capabilities.channels.length;
    let firstError: unknown;
    try {
      await this.write(connection, stopCommand(channelCount));
    } catch (error) {
      firstError = error;
    }
    try {
      await this.write(connection, buildPatternStopCommand(channelCount));
    } catch (error) {
      firstError ??= error;
    }
    connection.patternChannels = capabilities.channels.map(() => ({ intensity: 1, pattern: 0 }));
    connection.continuousChannels = capabilities.channels.map(() => 0);
    if (firstError) throw firstError;
  }

  private channelIndexes(channelCount: number, target: MotorTarget): number[] {
    if (target === 'all') return Array.from({ length: channelCount }, (_, index) => index);
    if (!Number.isInteger(target) || target < 0 || target >= channelCount) {
      throw new RangeError('El motor seleccionado no está disponible en este dispositivo.');
    }
    return [target];
  }

  private activePatternFor(connection: ConnectedDevice, target: MotorTarget): number | undefined {
    const channelCount = connection.capabilities?.channels.length ?? 0;
    if (!channelCount) return undefined;
    const patterns = this.channelIndexes(channelCount, target)
      .map((index) => connection.patternChannels[index]?.pattern ?? 0);
    const first = patterns[0];
    return first > 0 && patterns.every((pattern) => pattern === first) ? first : undefined;
  }

  private async forEachTarget(
    targets: ConnectedDevice[],
    operation: (connection: ConnectedDevice) => Promise<void>,
  ): Promise<void> {
    let firstError: unknown;
    for (const connection of targets) {
      try {
        await operation(connection);
      } catch (error) {
        firstError ??= error;
      }
    }
    if (firstError) throw firstError;
  }

  private async write(connection: ConnectedDevice, bytes: Uint8Array): Promise<void> {
    if (!this.connections.has(connection.id)) throw new Error('No hay un dispositivo BLE conectado.');
    try {
      const value = bytesToBase64(bytes);
      if (__DEV__) {
        console.info('[Camtoyz BLE] FFE2', connection.id, Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(' '));
      }
      if (connection.writeCharacteristic.isWritableWithoutResponse) {
        await connection.writeCharacteristic.writeWithoutResponse(value);
      } else {
        await connection.writeCharacteristic.writeWithResponse(value);
      }
    } catch (error) {
      this.handleDisconnected(connection.id, errorMessage(error));
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
}

const globalBle = globalThis as typeof globalThis & { __camtoyzBleManager?: BleManager };

// Mantiene un único cliente nativo incluso durante Fast Refresh, evitando GATT huérfanos.
export const ble = (globalBle.__camtoyzBleManager ??= BleManager.shared);
