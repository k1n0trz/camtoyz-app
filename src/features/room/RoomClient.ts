import { io, type Socket } from 'socket.io-client';

import type {
  ClientToServerEvents,
  RoomAck,
  RoomEndedReason,
  RoomRemovedReason,
  ReceivedPeerSignal,
  PeerSignalPayload,
  RoomIceConfig,
  RoomSessionData,
  RoomSnapshot,
  ServerToClientEvents,
} from '../../../shared/roomProtocol';
import { getRoomServerUrl } from './roomConfig';
import {
  clearRoomSession,
  getInstallationId,
  loadRoomSession,
  saveRoomSession,
  type StoredRoomSession,
} from './roomIdentity';

export type RoomConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface RoomClientSnapshot {
  connectionState: RoomConnectionState;
  room?: RoomSnapshot;
  participantId?: string;
  iceConfig?: RoomIceConfig;
  error?: string;
  removedReason?: RoomRemovedReason;
  endedReason?: RoomEndedReason;
}

type Listener = (snapshot: RoomClientSnapshot) => void;

const ACK_TIMEOUT_MS = 10_000;

export class RoomClient {
  private socket?: Socket<ServerToClientEvents, ClientToServerEvents>;
  private listeners = new Set<Listener>();
  private peerSignalListeners = new Set<(signal: ReceivedPeerSignal) => void>();
  private storedSession?: StoredRoomSession;
  private resumePromise?: Promise<boolean>;
  private state: RoomClientSnapshot = { connectionState: 'idle' };

  get snapshot(): RoomClientSnapshot {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  subscribePeerSignals(listener: (signal: ReceivedPeerSignal) => void): () => void {
    this.peerSignalListeners.add(listener);
    return () => this.peerSignalListeners.delete(listener);
  }

  private update(next: Partial<RoomClientSnapshot>): void {
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener(this.state);
  }

  private getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
    if (this.socket) return this.socket;

    const serverUrl = getRoomServerUrl();
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(serverUrl, {
      autoConnect: false,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 750,
      reconnectionDelayMax: 5_000,
      timeout: ACK_TIMEOUT_MS,
    });

    socket.on('connect', () => {
      this.update({ connectionState: 'connected', error: undefined });
      if (this.storedSession && !socket.recovered) void this.resumeStoredSession();
    });
    socket.on('disconnect', () => {
      this.update({ connectionState: this.state.room ? 'reconnecting' : 'idle' });
    });
    socket.on('connect_error', () => {
      this.update({
        connectionState: this.state.room ? 'reconnecting' : 'error',
        error: 'No fue posible conectar con el servidor de salas.',
      });
    });
    socket.on('room:snapshot', (room) => this.update({ room, connectionState: 'connected' }));
    socket.on('room:removed', ({ reason }) => void this.handleRemoved(reason));
    socket.on('room:ended', ({ reason }) => void this.handleEnded(reason));
    socket.on('peer:signal', (signal) => {
      for (const listener of this.peerSignalListeners) listener(signal);
    });

    this.socket = socket;
    return socket;
  }

  private async ensureConnected(): Promise<Socket<ServerToClientEvents, ClientToServerEvents>> {
    const socket = this.getSocket();
    if (socket.connected) return socket;
    this.update({ connectionState: 'connecting', error: undefined });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('El servidor de salas no respondió.'));
      }, ACK_TIMEOUT_MS);
      const onConnect = () => {
        cleanup();
        resolve(socket);
      };
      const onError = () => {
        cleanup();
        reject(new Error('No fue posible conectar con el servidor de salas.'));
      };
      const cleanup = () => {
        clearTimeout(timer);
        socket.off('connect', onConnect);
        socket.off('connect_error', onError);
      };
      socket.once('connect', onConnect);
      socket.once('connect_error', onError);
      socket.connect();
    });
  }

  private emitWithAck<T>(emit: (ack: (response: RoomAck<T>) => void) => void): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('La operación tardó demasiado.')), ACK_TIMEOUT_MS);
      emit((response) => {
        clearTimeout(timer);
        if (response.ok) resolve(response.data);
        else reject(new Error(response.error.message));
      });
    });
  }

  private async acceptSession(session: RoomSessionData): Promise<void> {
    const participantId = await getInstallationId();
    this.storedSession = { roomCode: session.snapshot.code, participantId, resumeToken: session.resumeToken };
    await saveRoomSession(this.storedSession);
    this.update({
      room: session.snapshot,
      participantId,
      iceConfig: undefined,
      connectionState: 'connected',
      error: undefined,
      removedReason: undefined,
      endedReason: undefined,
    });
    try {
      const iceConfig = await this.emitWithAck<RoomIceConfig>((ack) => this.socket?.emit('room:ice', ack));
      this.update({ iceConfig });
    } catch {
      // La sala sigue siendo útil en LAN aunque TURN no esté disponible.
    }
  }

  private async fail(error: unknown): Promise<never> {
    const message = error instanceof Error ? error.message : 'No fue posible completar la operación.';
    this.update({ connectionState: this.state.room ? 'reconnecting' : 'error', error: message });
    throw error instanceof Error ? error : new Error(message);
  }

  async create(displayName = 'Anfitrión'): Promise<RoomSnapshot> {
    try {
      const participantId = await getInstallationId();
      const socket = await this.ensureConnected();
      const session = await this.emitWithAck<RoomSessionData>((ack) =>
        socket.emit('room:create', { participantId, displayName }, ack),
      );
      await this.acceptSession(session);
      return session.snapshot;
    } catch (error) {
      return this.fail(error);
    }
  }

  async join(roomCode: string, displayName = 'Invitado'): Promise<RoomSnapshot> {
    try {
      const participantId = await getInstallationId();
      const socket = await this.ensureConnected();
      const session = await this.emitWithAck<RoomSessionData>((ack) =>
        socket.emit('room:join', { participantId, displayName, roomCode: roomCode.toUpperCase() }, ack),
      );
      await this.acceptSession(session);
      return session.snapshot;
    } catch (error) {
      return this.fail(error);
    }
  }

  async restore(): Promise<boolean> {
    if (this.state.room) return true;
    this.storedSession = await loadRoomSession();
    if (!this.storedSession) return false;
    try {
      await this.ensureConnected();
      return this.resumeStoredSession();
    } catch {
      return false;
    }
  }

  private resumeStoredSession(): Promise<boolean> {
    if (this.resumePromise) return this.resumePromise;
    this.resumePromise = this.performResume().finally(() => {
      this.resumePromise = undefined;
    });
    return this.resumePromise;
  }

  private async performResume(): Promise<boolean> {
    const stored = this.storedSession;
    const socket = this.socket;
    if (!stored || !socket?.connected) return false;
    try {
      const session = await this.emitWithAck<RoomSessionData>((ack) =>
        socket.emit('room:resume', stored, ack),
      );
      await this.acceptSession(session);
      return true;
    } catch (error) {
      await clearRoomSession();
      this.storedSession = undefined;
      this.update({ room: undefined, participantId: undefined, error: error instanceof Error ? error.message : undefined });
      return false;
    }
  }

  async leave(): Promise<void> {
    const socket = this.socket;
    try {
      if (socket?.connected && this.state.room) {
        await this.emitWithAck<{ left: true }>((ack) => socket.emit('room:leave', ack));
      }
    } finally {
      await this.clearSession();
    }
  }

  async kick(participantId: string): Promise<void> {
    const socket = await this.ensureConnected();
    await this.emitWithAck<RoomSnapshot>((ack) => socket.emit('room:kick', { participantId }, ack));
  }

  async block(participantId: string): Promise<void> {
    const socket = await this.ensureConnected();
    await this.emitWithAck<RoomSnapshot>((ack) => socket.emit('room:block', { participantId }, ack));
  }

  async sendPeerSignal(targetParticipantId: string, signal: PeerSignalPayload): Promise<void> {
    const socket = await this.ensureConnected();
    await this.emitWithAck<{ delivered: true }>((ack) =>
      socket.emit('peer:signal', { targetParticipantId, signal }, ack),
    );
  }

  async end(): Promise<void> {
    const socket = await this.ensureConnected();
    await this.emitWithAck<{ ended: true }>((ack) => socket.emit('room:end', ack));
    await this.clearSession();
  }

  clearOutcome(): void {
    this.update({ removedReason: undefined, endedReason: undefined, error: undefined });
  }

  clearError(): void {
    this.update({ error: undefined });
  }

  private async handleRemoved(reason: RoomRemovedReason): Promise<void> {
    await this.clearSession({ removedReason: reason });
  }

  private async handleEnded(reason: RoomEndedReason): Promise<void> {
    await this.clearSession({ endedReason: reason });
  }

  private async clearSession(outcome: Partial<RoomClientSnapshot> = {}): Promise<void> {
    await clearRoomSession();
    this.storedSession = undefined;
    this.update({
      room: undefined,
      participantId: undefined,
      iceConfig: undefined,
      connectionState: this.socket?.connected ? 'connected' : 'idle',
      ...outcome,
    });
  }
}

export const roomClient = new RoomClient();
