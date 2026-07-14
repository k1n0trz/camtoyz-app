import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const INSTALLATION_ID_KEY = 'camtoyz.room.installation-id.v1';
const ROOM_SESSION_KEY = 'camtoyz.room.session.v1';

export interface StoredRoomSession {
  roomCode: string;
  participantId: string;
  resumeToken: string;
}

export async function getInstallationId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (existing) return existing;

  const created = `install_${Crypto.randomUUID().replace(/-/g, '')}`;
  await SecureStore.setItemAsync(INSTALLATION_ID_KEY, created);
  return created;
}

export async function loadRoomSession(): Promise<StoredRoomSession | undefined> {
  const raw = await SecureStore.getItemAsync(ROOM_SESSION_KEY);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredRoomSession>;
    if (!parsed.roomCode || !parsed.participantId || !parsed.resumeToken) return undefined;
    return parsed as StoredRoomSession;
  } catch {
    await clearRoomSession();
    return undefined;
  }
}

export async function saveRoomSession(session: StoredRoomSession): Promise<void> {
  await SecureStore.setItemAsync(ROOM_SESSION_KEY, JSON.stringify(session));
}

export async function clearRoomSession(): Promise<void> {
  await SecureStore.deleteItemAsync(ROOM_SESSION_KEY);
}
