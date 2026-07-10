import { Platform } from 'react-native';
import {
  BleManager as NativeBleManager,
  type Characteristic,
  type Device,
  type Subscription,
} from 'react-native-ble-plx';

import { BLE, buildIntensityCommand, buildPatternCommand, stopCommand } from './protocol';
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
  rssi?: number;
  battery?: number;
}

export interface BleSnapshot {
  state: BleConnectionState;
  device?: BleDevice;
  error?: string;
}

type Listener = (snapshot: BleSnapshot) => void;

const RECONNECT_BACKOFF_MS = [500, 1000, 2000, 4000, 8000];
const TARGET_MTU = 185;
const SCAN_TIMEOUT_MS = 30_000;
const BATTERY_SERVICE = '0000180F-0000-1000-8000-00805F9B34FB';
const BATTERY_LEVEL = '00002A19-0000-1000-8000-00805F9B34FB';

function displayName(device: Device): string {
  return device.localName ?? device.name ?? 'Dispositivo Camtoyz';
}

function toPublicDevice(device: Device, battery?: number): BleDevice {
  return {
    id: device.id,
    name: displayName(device),
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
  if (!value) return undefined;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const high = alphabet.indexOf(value[0]);
  const low = alphabet.indexOf(value[1]);
  if (high < 0 || low < 0) return undefined;
  return (high << 2) | (low >> 4);
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

  async scan(onFound: (device: BleDevice) => void): Promise<void> {
    await requestBlePermissions();
    await this.waitUntilPoweredOn();
    await this.stopScan();

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
      const withMtu =
        Platform.OS === 'android'
          ? await connected.requestMTU(TARGET_MTU).catch(() => connected)
          : connected;
      const discovered = await withMtu.discoverAllServicesAndCharacteristics();

      this.nativeDevice = discovered;
      this.device = toPublicDevice(discovered, this.device?.battery);
      this.writeCharacteristic = await this.resolveWriteCharacteristic(discovered);
      this.attachDisconnectListener(discovered.id);
      await this.initializeProtocol(discovered);
      await this.attachBatteryMonitor(discovered);
      this.reconnectAttempt = 0;
      this.setState('connected');
    } catch (error) {
      const message = errorMessage(error);
      await this.native.cancelDeviceConnection(deviceId).catch(() => undefined);
      this.nativeDevice = undefined;
      this.writeCharacteristic = undefined;
      if (reconnecting) {
        this.scheduleReconnect();
      } else {
        this.setState('error', message);
        throw error;
      }
    }
  }

  private async resolveWriteCharacteristic(device: Device): Promise<Characteristic> {
    const characteristics = await device.characteristicsForService(BLE.serviceCommand);
    const commandUuid = BLE.characteristicCommand.toLowerCase();
    const writable =
      characteristics.find(
        (characteristic) =>
          characteristic.uuid.toLowerCase() === commandUuid &&
          (characteristic.isWritableWithoutResponse || characteristic.isWritableWithResponse),
      ) ??
      characteristics.find(
        (characteristic) =>
          characteristic.isWritableWithoutResponse || characteristic.isWritableWithResponse,
      );

    if (!writable) {
      throw new Error('El dispositivo no expone una característica BLE de escritura compatible.');
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
        this.protocolSubscription = notify.monitor(() => undefined);
      }

      if (init?.isWritableWithoutResponse || init?.isWritableWithResponse) {
        const write = (bytes: Uint8Array) =>
          init.isWritableWithoutResponse
            ? init.writeWithoutResponse(bytesToBase64(bytes))
            : init.writeWithResponse(bytesToBase64(bytes));
        await write(new Uint8Array([0x88, 0x00]));
        await new Promise((resolve) => setTimeout(resolve, 100));
        await write(new Uint8Array([0x88, 0x01]));
      }
    } catch {
      // El handshake aporta capacidades, pero no debe impedir usar firmwares antiguos.
    }
  }

  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    await this.stopScan();

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
    this.setState('disconnected');
  }

  async setIntensity(percent: number): Promise<void> {
    await this.write(buildIntensityCommand(percent));
  }

  async setPattern(index: number): Promise<void> {
    await this.write(buildPatternCommand(index));
  }

  async stop(): Promise<void> {
    await this.write(stopCommand());
  }

  private async write(bytes: Uint8Array): Promise<void> {
    if (this.state !== 'connected' || !this.writeCharacteristic) {
      throw new Error('No hay un dispositivo BLE conectado.');
    }

    try {
      const value = bytesToBase64(bytes);
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
    const name = (device.localName ?? device.name ?? '').toLowerCase();
    const knownName = BLE.nameHints.some((hint) => name.includes(hint.toLowerCase()));
    const knownService = device.serviceUUIDs?.some((uuid) =>
      BLE.serviceHints.some((hint) => uuid.toUpperCase().includes(hint)),
    );
    return knownName || Boolean(knownService);
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
    return { state: this.state, device: this.device, error: this.lastError };
  }
}

export const ble = BleManager.shared;
