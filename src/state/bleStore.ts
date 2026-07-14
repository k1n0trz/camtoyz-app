import { create } from 'zustand';

import { ble, type BleConnectionState, type BleDevice } from '@/ble/BleManager';

interface BleStore {
  connectionState: BleConnectionState;
  device?: BleDevice;
  connectedDevices: BleDevice[];
  activeDeviceId?: string;
  syncEnabled: boolean;
  isScanning: boolean;
  devices: BleDevice[];
  activePattern?: number;
  commandBusy: boolean;
  error?: string;
  scan: () => Promise<void>;
  stopScan: () => Promise<void>;
  connect: (deviceId: string) => Promise<boolean>;
  disconnect: (deviceId?: string) => Promise<void>;
  retryConnection: () => Promise<void>;
  setActiveDevice: (deviceId: string) => void;
  setSyncEnabled: (enabled: boolean) => void;
  setPattern: (index: number) => Promise<boolean>;
  setIntensity: (percent: number) => Promise<boolean>;
  stop: () => Promise<boolean>;
  clearError: () => void;
}

function upsertDevice(devices: BleDevice[], incoming: BleDevice): BleDevice[] {
  const index = devices.findIndex((device) => device.id === incoming.id);
  if (index < 0) return [...devices, incoming];
  return devices.map((device, position) => (position === index ? incoming : device));
}

export const useBleStore = create<BleStore>((set) => ({
  connectionState: ble.snapshot.state,
  device: ble.snapshot.device,
  connectedDevices: ble.snapshot.devices,
  activeDeviceId: ble.snapshot.activeDeviceId,
  syncEnabled: ble.snapshot.syncEnabled,
  isScanning: ble.snapshot.isScanning,
  devices: [],
  activePattern: ble.snapshot.activePattern,
  commandBusy: false,
  error: ble.snapshot.error,

  scan: async () => {
    set({ devices: [], error: undefined });
    try {
      await ble.scan((device) => {
        set((state) => ({ devices: upsertDevice(state.devices, device) }));
      });
    } catch (error) {
      set({
        connectionState: 'error',
        error: error instanceof Error ? error.message : 'No fue posible iniciar la búsqueda.',
      });
    }
  },

  stopScan: () => ble.stopScan(),

  connect: async (deviceId) => {
    try {
      await ble.connect(deviceId);
      return true;
    } catch (error) {
      set({
        connectionState: 'error',
        error: error instanceof Error ? error.message : 'No fue posible conectar el dispositivo.',
      });
      return false;
    }
  },

  disconnect: (deviceId) => ble.disconnect(deviceId),

  retryConnection: async () => {
    try {
      await ble.retryConnection();
    } catch (error) {
      set({
        connectionState: 'error',
        error: error instanceof Error ? error.message : 'No fue posible reconectar.',
      });
    }
  },

  setActiveDevice: (deviceId) => ble.setActiveDevice(deviceId),

  setSyncEnabled: (enabled) => ble.setSyncEnabled(enabled),

  setPattern: async (index) => {
    set({ commandBusy: true, error: undefined });
    try {
      await ble.setPattern(index);
      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'No fue posible activar el patrón.',
      });
      return false;
    } finally {
      set({ commandBusy: false });
    }
  },

  setIntensity: async (percent) => {
    set({ commandBusy: true, error: undefined });
    try {
      await ble.setIntensity(percent);
      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'No fue posible cambiar la intensidad.',
      });
      return false;
    } finally {
      set({ commandBusy: false });
    }
  },

  stop: async () => {
    set({ commandBusy: true, error: undefined });
    try {
      await ble.stop();
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'No fue posible detener el motor.' });
      return false;
    } finally {
      set({ commandBusy: false });
    }
  },

  clearError: () => set({ error: undefined }),
}));

ble.subscribe((snapshot) => {
  useBleStore.setState({
    connectionState: snapshot.state,
    device: snapshot.device,
    connectedDevices: snapshot.devices,
    activeDeviceId: snapshot.activeDeviceId,
    syncEnabled: snapshot.syncEnabled,
    isScanning: snapshot.isScanning,
    activePattern: snapshot.activePattern,
    error: snapshot.error,
  });
});
