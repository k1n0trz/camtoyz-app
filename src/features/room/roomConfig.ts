import Constants from 'expo-constants';

const DEFAULT_ROOM_SERVER_PORT = 8787;

export function getRoomServerUrl(): string {
  const configured = process.env.EXPO_PUBLIC_ROOM_SERVER_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:${DEFAULT_ROOM_SERVER_PORT}`;

  return `http://127.0.0.1:${DEFAULT_ROOM_SERVER_PORT}`;
}
