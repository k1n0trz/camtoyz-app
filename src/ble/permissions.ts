import { PermissionsAndroid, Platform } from 'react-native';

export async function requestBlePermissions(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const permissions =
    Platform.Version >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const result = await PermissionsAndroid.requestMultiple(permissions);
  const denied = permissions.some(
    (permission) => result[permission] !== PermissionsAndroid.RESULTS.GRANTED,
  );

  if (denied) {
    throw new Error('Camtoyz necesita permiso de Bluetooth para buscar y conectar dispositivos.');
  }
}
