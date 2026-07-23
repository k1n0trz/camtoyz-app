import { createHmac } from 'node:crypto';
import { createServer, type Server as HttpServer } from 'node:http';

import { Server, type Socket } from 'socket.io';

import {
  SIGNAL_MAX_BYTES,
  type ClientToServerEvents,
  type InterServerEvents,
  type PeerSignalPayload,
  type RoomAck,
  type RoomEndedReason,
  type RoomErrorPayload,
  type RoomIceConfig,
  type RoomRole,
  type RoomSnapshot,
  type RoomSocketData,
  type ServerToClientEvents,
} from '../../shared/roomProtocol';
import { RoomRegistry, RoomRegistryError, type RoomRegistryOptions } from './roomRegistry';

type RoomSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, RoomSocketData>;

export interface RoomServerOptions extends RoomRegistryOptions {
  allowedOrigins?: string[];
  recoveryWindowMs?: number;
  cleanupIntervalMs?: number;
  turnUrls?: string[];
  turnSharedSecret?: string;
  turnCredentialTtlMs?: number;
  logger?: Pick<Console, 'info' | 'error'>;
}

export interface RunningRoomServer {
  httpServer: HttpServer;
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, RoomSocketData>;
  registry: RoomRegistry;
  listen: (port?: number, host?: string) => Promise<number>;
  close: () => Promise<void>;
}

const roomChannel = (code: string) => `room:${code}`;

function errorPayload(error: unknown): RoomErrorPayload {
  if (error instanceof RoomRegistryError) return { code: error.code, message: error.message };
  return { code: 'INVALID_REQUEST', message: 'No fue posible procesar la solicitud.' };
}

function success<T>(data: T): RoomAck<T> {
  return { ok: true, data };
}

function failure<T>(error: unknown): RoomAck<T> {
  return { ok: false, error: errorPayload(error) };
}

function isValidSignal(signal: PeerSignalPayload): boolean {
  if (!signal || !['offer', 'answer', 'ice'].includes(signal.type)) return false;
  try {
    return Buffer.byteLength(JSON.stringify(signal), 'utf8') <= SIGNAL_MAX_BYTES;
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string | undefined, host: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin || allowedOrigins.includes(origin)) return true;
  try {
    // Algunos clientes nativos anuncian el propio destino WebSocket como Origin.
    // Se permite únicamente si coincide con el host que recibirá la conexión.
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function clearMembership(socket: RoomSocket): void {
  delete socket.data.roomCode;
  delete socket.data.participantId;
  delete socket.data.role;
}

class SlidingWindowLimiter {
  private readonly actions = new Map<string, number[]>();

  allow(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
    const recent = (this.actions.get(key) ?? []).filter((timestamp) => timestamp > now - windowMs);
    if (recent.length >= limit) {
      this.actions.set(key, recent);
      return false;
    }
    recent.push(now);
    this.actions.set(key, recent);
    return true;
  }
}

export function createRoomServer(options: RoomServerOptions = {}): RunningRoomServer {
  const logger = options.logger ?? console;
  const recoveryWindowMs = Math.max(1_000, options.recoveryWindowMs ?? 30_000);
  const cleanupIntervalMs = Math.max(1_000, options.cleanupIntervalMs ?? 60_000);
  const allowedOrigins = options.allowedOrigins ?? [];
  const turnUrls = (options.turnUrls ?? []).map((url) => url.trim()).filter(Boolean);
  const turnSharedSecret = options.turnSharedSecret?.trim();
  const turnCredentialTtlMs = Math.max(60_000, options.turnCredentialTtlMs ?? 60 * 60 * 1_000);
  const registry = new RoomRegistry(options);
  const httpServer = createServer((request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ ok: true, activeRooms: registry.activeRoomCount }));
      return;
    }
    response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ ok: false }));
  });
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, RoomSocketData>(httpServer, {
    cors: { origin: allowedOrigins },
    allowRequest: (request, callback) => {
      const origin = request.headers.origin;
      callback(null, isAllowedOrigin(origin, request.headers.host, allowedOrigins));
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: recoveryWindowMs,
      skipMiddlewares: false,
    },
    maxHttpBufferSize: 32 * 1024,
  });
  const disconnectTimers = new Map<string, NodeJS.Timeout>();
  const keyFor = (roomCode: string, participantId: string) => `${roomCode}:${participantId}`;

  const issueIceConfig = (participantId: string): RoomIceConfig => {
    const expiresAt = Date.now() + turnCredentialTtlMs;
    if (!turnSharedSecret || !turnUrls.length) return { iceServers: [], expiresAt };
    const username = `${Math.floor(expiresAt / 1_000)}:${participantId}`;
    const credential = createHmac('sha1', turnSharedSecret).update(username).digest('base64');
    return { iceServers: [{ urls: turnUrls, username, credential }], expiresAt };
  };

  const cancelDisconnect = (roomCode: string, participantId: string) => {
    const key = keyFor(roomCode, participantId);
    const timer = disconnectTimers.get(key);
    if (timer) clearTimeout(timer);
    disconnectTimers.delete(key);
  };

  const emitSnapshot = (roomCode: string) => {
    const snapshot = registry.getSnapshot(roomCode);
    if (snapshot) io.to(roomChannel(roomCode)).emit('room:snapshot', snapshot);
  };

  const clearRoomSockets = (roomCode: string) => {
    for (const peer of io.of('/').sockets.values()) {
      if (peer.data.roomCode === roomCode) clearMembership(peer);
    }
    io.in(roomChannel(roomCode)).socketsLeave(roomChannel(roomCode));
  };

  const endRoom = (roomCode: string, reason: RoomEndedReason) => {
    io.to(roomChannel(roomCode)).emit('room:ended', { reason });
    registry.endRoom(roomCode);
    clearRoomSockets(roomCode);
  };

  io.on('connection', (socket) => {
    const limiter = new SlidingWindowLimiter();
    const rateLimited = (bucket: string, limit: number) => !limiter.allow(bucket, limit, 60_000);
    const ensureAvailable = () => {
      if (socket.data.roomCode) throw new RoomRegistryError('ALREADY_IN_ROOM', 'Sal primero de la sala actual.');
    };
    const requireMembership = (): { roomCode: string; participantId: string; role: RoomRole } => {
      const { roomCode, participantId, role } = socket.data;
      if (!roomCode || !participantId || !role) {
        throw new RoomRegistryError('NOT_IN_ROOM', 'No perteneces a una sala activa.');
      }
      return { roomCode, participantId, role };
    };
    const requireHost = () => {
      const membership = requireMembership();
      if (membership.role !== 'host') throw new RoomRegistryError('FORBIDDEN', 'Solo el anfitrión puede realizar esta acción.');
      return membership;
    };
    const attach = async (roomCode: string, participantId: string, role: RoomRole) => {
      socket.data.roomCode = roomCode;
      socket.data.participantId = participantId;
      socket.data.role = role;
      cancelDisconnect(roomCode, participantId);
      await socket.join(roomChannel(roomCode));
    };

    if (socket.recovered && socket.data.roomCode && socket.data.participantId) {
      const snapshot = registry.resumeRecovered(socket.data.roomCode, socket.data.participantId, socket.id);
      if (snapshot) {
        cancelDisconnect(socket.data.roomCode, socket.data.participantId);
        emitSnapshot(socket.data.roomCode);
      } else {
        clearMembership(socket);
      }
    }

    socket.on('room:create', async (request, ack) => {
      try {
        if (rateLimited('entry', 10)) throw new RoomRegistryError('RATE_LIMITED', 'Espera antes de crear otra sala.');
        ensureAvailable();
        const session = registry.create(request?.participantId ?? '', request?.displayName ?? '', socket.id);
        await attach(session.snapshot.code, request.participantId.trim(), 'host');
        ack(success(session));
        emitSnapshot(session.snapshot.code);
      } catch (error) {
        ack(failure(error));
      }
    });

    socket.on('room:join', async (request, ack) => {
      try {
        if (rateLimited('entry', 10)) throw new RoomRegistryError('RATE_LIMITED', 'Espera antes de intentar otro código.');
        ensureAvailable();
        const session = registry.join(request?.roomCode ?? '', request?.participantId ?? '', request?.displayName ?? '', socket.id);
        await attach(session.snapshot.code, request.participantId.trim(), 'member');
        ack(success(session));
        emitSnapshot(session.snapshot.code);
      } catch (error) {
        ack(failure(error));
      }
    });

    socket.on('room:resume', async (request, ack) => {
      try {
        if (rateLimited('entry', 10)) throw new RoomRegistryError('RATE_LIMITED', 'Espera antes de reanudar.');
        ensureAvailable();
        const previousSocketId = registry.getConnectedSocketId(request?.roomCode ?? '', request?.participantId ?? '');
        const session = registry.resume(request?.roomCode ?? '', request?.participantId ?? '', request?.resumeToken ?? '', socket.id);
        const participant = registry.getParticipant(session.snapshot.code, request.participantId);
        if (!participant) throw new RoomRegistryError('PARTICIPANT_NOT_FOUND', 'La sesión ya no existe.');
        if (previousSocketId && previousSocketId !== socket.id) {
          const previousSocket = io.of('/').sockets.get(previousSocketId);
          if (previousSocket) {
            previousSocket.leave(roomChannel(session.snapshot.code));
            clearMembership(previousSocket);
            previousSocket.disconnect(true);
          }
        }
        await attach(session.snapshot.code, participant.id, participant.role);
        ack(success(session));
        emitSnapshot(session.snapshot.code);
      } catch (error) {
        ack(failure(error));
      }
    });

    socket.on('room:leave', (ack) => {
      try {
        const membership = requireMembership();
        cancelDisconnect(membership.roomCode, membership.participantId);
        if (membership.role === 'host') {
          endRoom(membership.roomCode, 'host_ended');
        } else {
          registry.removeParticipant(membership.roomCode, membership.participantId);
          socket.leave(roomChannel(membership.roomCode));
          clearMembership(socket);
          emitSnapshot(membership.roomCode);
        }
        ack(success({ left: true }));
      } catch (error) {
        ack(failure(error));
      }
    });

    const moderate = (mode: 'kick' | 'block') => (request: { participantId: string }, ack: (response: RoomAck<RoomSnapshot>) => void) => {
      try {
        if (rateLimited('moderation', 30)) throw new RoomRegistryError('RATE_LIMITED', 'Demasiadas acciones de moderación.');
        const membership = requireHost();
        const removed = mode === 'block'
          ? registry.blockParticipant(membership.roomCode, request?.participantId ?? '')
          : registry.removeParticipant(membership.roomCode, request?.participantId ?? '');
        cancelDisconnect(membership.roomCode, removed.participant.id);
        if (removed.socketId) {
          const target = io.of('/').sockets.get(removed.socketId);
          target?.emit('room:removed', { reason: mode === 'block' ? 'blocked' : 'kicked' });
          if (target) {
            target.leave(roomChannel(membership.roomCode));
            clearMembership(target);
          }
        }
        const snapshot = registry.getSnapshot(membership.roomCode);
        if (!snapshot) throw new RoomRegistryError('ROOM_NOT_FOUND', 'La sala ya terminó.');
        emitSnapshot(membership.roomCode);
        ack(success(snapshot));
      } catch (error) {
        ack(failure(error));
      }
    };

    socket.on('room:kick', moderate('kick'));
    socket.on('room:block', moderate('block'));

    socket.on('room:end', (ack) => {
      try {
        const membership = requireHost();
        endRoom(membership.roomCode, 'host_ended');
        ack(success({ ended: true }));
      } catch (error) {
        ack(failure(error));
      }
    });

    socket.on('room:ice', (ack) => {
      try {
        const membership = requireMembership();
        ack(success(issueIceConfig(membership.participantId)));
      } catch (error) {
        ack(failure(error));
      }
    });

    socket.on('peer:signal', (request, ack) => {
      try {
        if (rateLimited('signal', 180)) throw new RoomRegistryError('RATE_LIMITED', 'Demasiados mensajes de señalización.');
        const membership = requireMembership();
        if (!request || !isValidSignal(request.signal)) {
          throw new RoomRegistryError('SIGNAL_TOO_LARGE', 'La señal WebRTC no es válida o excede el límite.');
        }
        if (request.targetParticipantId === membership.participantId) {
          throw new RoomRegistryError('INVALID_REQUEST', 'No puedes enviarte señalización a ti mismo.');
        }
        const targetSocketId = registry.getConnectedSocketId(membership.roomCode, request.targetParticipantId);
        if (!targetSocketId) throw new RoomRegistryError('PARTICIPANT_NOT_FOUND', 'El participante no está conectado.');
        io.to(targetSocketId).emit('peer:signal', {
          fromParticipantId: membership.participantId,
          signal: request.signal,
        });
        ack(success({ delivered: true }));
      } catch (error) {
        ack(failure(error));
      }
    });

    socket.on('disconnect', () => {
      const { roomCode, participantId } = socket.data;
      if (!roomCode || !participantId) return;
      const participant = registry.markDisconnected(roomCode, participantId, socket.id);
      if (!participant) return;
      emitSnapshot(roomCode);
      cancelDisconnect(roomCode, participantId);
      const timer = setTimeout(() => {
        disconnectTimers.delete(keyFor(roomCode, participantId));
        const current = registry.getParticipant(roomCode, participantId);
        if (!current || current.connected) return;
        if (current.role === 'host') {
          endRoom(roomCode, 'host_disconnected');
          return;
        }
        try {
          registry.removeParticipant(roomCode, participantId);
          emitSnapshot(roomCode);
        } catch (error) {
          logger.error('No fue posible limpiar un participante desconectado.', error);
        }
      }, recoveryWindowMs);
      disconnectTimers.set(keyFor(roomCode, participantId), timer);
    });
  });

  const cleanupTimer = setInterval(() => {
    for (const code of registry.expireRooms()) {
      io.to(roomChannel(code)).emit('room:ended', { reason: 'expired' });
      clearRoomSockets(code);
    }
  }, cleanupIntervalMs);
  cleanupTimer.unref();

  return {
    httpServer,
    io,
    registry,
    listen: (port = 0, host = '127.0.0.1') => new Promise<number>((resolve, reject) => {
      const onError = (error: Error) => reject(error);
      httpServer.once('error', onError);
      httpServer.listen(port, host, () => {
        httpServer.off('error', onError);
        const address = httpServer.address();
        if (!address || typeof address === 'string') return reject(new Error('No fue posible determinar el puerto del servidor.'));
        logger.info(`Room server listening on ${host}:${address.port}`);
        resolve(address.port);
      });
    }),
    close: async () => {
      clearInterval(cleanupTimer);
      for (const timer of disconnectTimers.values()) clearTimeout(timer);
      disconnectTimers.clear();
      await new Promise<void>((resolve) => io.close(() => resolve()));
      if (httpServer.listening) {
        await new Promise<void>((resolve, reject) => httpServer.close((error) => error ? reject(error) : resolve()));
      }
    },
  };
}
