import { create } from 'zustand';

import { ble, type BleConnectionState, type BleDevice } from '@/ble/BleManager';

interface BleStore {
  connectionState: BleConnectionState;
  device?: BleDevice;
  devices: BleDevice[];
  error?: string;
  scan: () => Promise<void>;
  stopScan: () => Promise<void>;
  connect: (deviceId: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  retryConnection: () => Promise<void>;
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
  devices: [],
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

  disconnect: () => ble.disconnect(),

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

  clearError: () => set({ error: undefined }),
}));

ble.subscribe((snapshot) => {
  useBleStore.setState({
    connectionState: snapshot.state,
    device: snapshot.device,
    error: snapshot.error,
  });
});
