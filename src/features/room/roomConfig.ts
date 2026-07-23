import Constants from 'expo-constants';

const DEFAULT_ROOM_SERVER_PORT = 8787;
export const PRODUCTION_ROOM_SERVER_URL = 'https://app.camtoyz.com';

export function getRoomServerUrl(): string {
  // Una compilación instalada nunca debe intentar usar el propio teléfono
  // como servidor. El host de Metro solo es válido durante desarrollo.
  if (!__DEV__) return PRODUCTION_ROOM_SERVER_URL;

  const configured = process.env.EXPO_PUBLIC_ROOM_SERVER_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  const embedded = Constants.expoConfig?.extra?.roomServerUrl;
  if (typeof embedded === 'string' && embedded.trim()) {
    return embedded.trim().replace(/\/$/, '');
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:${DEFAULT_ROOM_SERVER_PORT}`;

  return `http://127.0.0.1:${DEFAULT_ROOM_SERVER_PORT}`;
}
