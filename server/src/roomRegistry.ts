import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import {
  DISPLAY_NAME_MAX_LENGTH,
  PARTICIPANT_ID_PATTERN,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_CODE_PATTERN,
  type RoomErrorCode,
  type RoomParticipant,
  type RoomSnapshot,
} from '../../shared/roomProtocol';

interface ParticipantRecord extends RoomParticipant {
  socketId?: string;
  resumeTokenHash: Buffer;
}

interface RoomRecord {
  code: string;
  participants: Map<string, ParticipantRecord>;
  blockedParticipantIds: Set<string>;
  createdAt: number;
  expiresAt: number;
}

export interface RoomRegistryOptions {
  maxParticipants?: number;
  roomTtlMs?: number;
  now?: () => number;
}

export class RoomRegistryError extends Error {
  constructor(public readonly code: RoomErrorCode, message: string) {
    super(message);
    this.name = 'RoomRegistryError';
  }
}

export interface CreatedSession {
  snapshot: RoomSnapshot;
  resumeToken: string;
}

export interface RemovedParticipant {
  participant: RoomParticipant;
  socketId?: string;
}

const DEFAULT_ROOM_TTL_MS = 6 * 60 * 60 * 1000;

function tokenHash(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

function tokensMatch(token: string, expected: Buffer): boolean {
  const actual = tokenHash(token);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function createSecret(): string {
  return randomBytes(32).toString('base64url');
}

function normalizeCode(roomCode: string): string {
  return roomCode.trim().toUpperCase();
}

function sanitizeIdentity(participantId: string, displayName: string): { participantId: string; displayName: string } {
  const cleanId = participantId.trim();
  const cleanName = displayName.trim().replace(/\s+/g, ' ');
  if (!PARTICIPANT_ID_PATTERN.test(cleanId)) {
    throw new RoomRegistryError('INVALID_REQUEST', 'El identificador del participante no es válido.');
  }
  if (!cleanName || cleanName.length > DISPLAY_NAME_MAX_LENGTH) {
    throw new RoomRegistryError('INVALID_REQUEST', `El nombre debe tener entre 1 y ${DISPLAY_NAME_MAX_LENGTH} caracteres.`);
  }
  return { participantId: cleanId, displayName: cleanName };
}

export class RoomRegistry {
  private readonly rooms = new Map<string, RoomRecord>();
  readonly maxParticipants: number;
  private readonly roomTtlMs: number;
  private readonly now: () => number;

  constructor(options: RoomRegistryOptions = {}) {
    this.maxParticipants = Math.max(2, Math.min(32, options.maxParticipants ?? 8));
    this.roomTtlMs = Math.max(60_000, options.roomTtlMs ?? DEFAULT_ROOM_TTL_MS);
    this.now = options.now ?? Date.now;
  }

  get activeRoomCount(): number {
    return this.rooms.size;
  }

  create(participantId: string, displayName: string, socketId: string): CreatedSession {
    const identity = sanitizeIdentity(participantId, displayName);
    const code = this.generateUniqueCode();
    const now = this.now();
    const resumeToken = createSecret();
    const room: RoomRecord = {
      code,
      participants: new Map(),
      blockedParticipantIds: new Set(),
      createdAt: now,
      expiresAt: now + this.roomTtlMs,
    };
    room.participants.set(identity.participantId, {
      id: identity.participantId,
      displayName: identity.displayName,
      role: 'host',
      connected: true,
      joinedAt: now,
      socketId,
      resumeTokenHash: tokenHash(resumeToken),
    });
    this.rooms.set(code, room);
    return { snapshot: this.toSnapshot(room), resumeToken };
  }

  join(roomCode: string, participantId: string, displayName: string, socketId: string): CreatedSession {
    const identity = sanitizeIdentity(participantId, displayName);
    const room = this.requireRoom(roomCode);
    if (room.blockedParticipantIds.has(identity.participantId)) {
      throw new RoomRegistryError('BLOCKED', 'Este dispositivo está bloqueado en la sala.');
    }
    if (room.participants.has(identity.participantId)) {
      throw new RoomRegistryError('IDENTITY_IN_USE', 'La identidad ya pertenece a esta sala; usa reanudar.');
    }
    if (room.participants.size >= this.maxParticipants) {
      throw new RoomRegistryError('ROOM_FULL', 'La sala alcanzó su límite de participantes.');
    }
    const resumeToken = createSecret();
    room.participants.set(identity.participantId, {
      id: identity.participantId,
      displayName: identity.displayName,
      role: 'member',
      connected: true,
      joinedAt: this.now(),
      socketId,
      resumeTokenHash: tokenHash(resumeToken),
    });
    return { snapshot: this.toSnapshot(room), resumeToken };
  }

  resume(roomCode: string, participantId: string, resumeToken: string, socketId: string): CreatedSession {
    const room = this.requireRoom(roomCode);
    const participant = room.participants.get(participantId);
    if (!participant) throw new RoomRegistryError('PARTICIPANT_NOT_FOUND', 'La sesión ya no existe.');
    if (!tokensMatch(resumeToken, participant.resumeTokenHash)) {
      throw new RoomRegistryError('INVALID_RESUME_TOKEN', 'No fue posible verificar la sesión.');
    }
    if (participant.connected && participant.socketId !== socketId) {
      throw new RoomRegistryError('IDENTITY_IN_USE', 'La sesión ya está activa en otro dispositivo.');
    }
    participant.connected = true;
    participant.socketId = socketId;
    return { snapshot: this.toSnapshot(room), resumeToken };
  }

  resumeRecovered(roomCode: string, participantId: string, socketId: string): RoomSnapshot | undefined {
    const room = this.getRoom(roomCode);
    const participant = room?.participants.get(participantId);
    if (!room || !participant) return undefined;
    participant.connected = true;
    participant.socketId = socketId;
    return this.toSnapshot(room);
  }

  markDisconnected(roomCode: string, participantId: string, socketId: string): RoomParticipant | undefined {
    const room = this.getRoom(roomCode);
    const participant = room?.participants.get(participantId);
    if (!participant || participant.socketId !== socketId) return undefined;
    participant.connected = false;
    participant.socketId = undefined;
    return this.toParticipant(participant);
  }

  removeParticipant(roomCode: string, participantId: string): RemovedParticipant {
    const room = this.requireRoom(roomCode);
    const participant = room.participants.get(participantId);
    if (!participant) throw new RoomRegistryError('PARTICIPANT_NOT_FOUND', 'El participante ya no está en la sala.');
    if (participant.role === 'host') throw new RoomRegistryError('FORBIDDEN', 'El anfitrión no puede ser expulsado.');
    room.participants.delete(participantId);
    return { participant: this.toParticipant(participant), socketId: participant.socketId };
  }

  blockParticipant(roomCode: string, participantId: string): RemovedParticipant {
    const room = this.requireRoom(roomCode);
    const removed = this.removeParticipant(roomCode, participantId);
    room.blockedParticipantIds.add(participantId);
    return removed;
  }

  endRoom(roomCode: string): void {
    this.rooms.delete(normalizeCode(roomCode));
  }

  getSnapshot(roomCode: string): RoomSnapshot | undefined {
    const room = this.getRoom(roomCode);
    return room ? this.toSnapshot(room) : undefined;
  }

  getParticipant(roomCode: string, participantId: string): RoomParticipant | undefined {
    const participant = this.getRoom(roomCode)?.participants.get(participantId);
    return participant ? this.toParticipant(participant) : undefined;
  }

  getConnectedSocketId(roomCode: string, participantId: string): string | undefined {
    const participant = this.getRoom(roomCode)?.participants.get(participantId);
    return participant?.connected ? participant.socketId : undefined;
  }

  expireRooms(): string[] {
    const now = this.now();
    const expired: string[] = [];
    for (const [code, room] of this.rooms) {
      if (room.expiresAt <= now) {
        expired.push(code);
        this.rooms.delete(code);
      }
    }
    return expired;
  }

  private requireRoom(roomCode: string): RoomRecord {
    const normalized = normalizeCode(roomCode);
    if (!ROOM_CODE_PATTERN.test(normalized)) {
      throw new RoomRegistryError('INVALID_REQUEST', 'El código de sala no es válido.');
    }
    const room = this.getRoom(normalized);
    if (!room) throw new RoomRegistryError('ROOM_NOT_FOUND', 'La sala no existe o ya terminó.');
    return room;
  }

  private getRoom(roomCode: string): RoomRecord | undefined {
    const normalized = normalizeCode(roomCode);
    const room = this.rooms.get(normalized);
    if (room && room.expiresAt <= this.now()) {
      this.rooms.delete(normalized);
      return undefined;
    }
    return room;
  }

  private generateUniqueCode(): string {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const bytes = randomBytes(ROOM_CODE_LENGTH);
      let code = '';
      for (const byte of bytes) code += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
      if (!this.rooms.has(code)) return code;
    }
    throw new RoomRegistryError('INVALID_REQUEST', 'No fue posible crear una sala en este momento.');
  }

  private toParticipant(participant: ParticipantRecord): RoomParticipant {
    return {
      id: participant.id,
      displayName: participant.displayName,
      role: participant.role,
      connected: participant.connected,
      joinedAt: participant.joinedAt,
    };
  }

  private toSnapshot(room: RoomRecord): RoomSnapshot {
    const participants = [...room.participants.values()]
      .map((participant) => this.toParticipant(participant))
      .sort((left, right) => (left.role === right.role ? left.joinedAt - right.joinedAt : left.role === 'host' ? -1 : 1));
    return {
      code: room.code,
      participants,
      createdAt: room.createdAt,
      expiresAt: room.expiresAt,
      maxParticipants: this.maxParticipants,
    };
  }
}
