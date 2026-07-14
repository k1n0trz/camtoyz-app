export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
export const PARTICIPANT_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
export const DISPLAY_NAME_MAX_LENGTH = 32;
export const SIGNAL_MAX_BYTES = 16 * 1024;

export type RoomRole = 'host' | 'member';
export type RoomRemovedReason = 'kicked' | 'blocked';
export type RoomEndedReason = 'host_ended' | 'host_disconnected' | 'expired';

export interface RoomParticipant {
  id: string;
  displayName: string;
  role: RoomRole;
  connected: boolean;
  joinedAt: number;
}

export interface RoomSnapshot {
  code: string;
  participants: RoomParticipant[];
  createdAt: number;
  expiresAt: number;
  maxParticipants: number;
}

export type RoomErrorCode =
  | 'INVALID_REQUEST'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'BLOCKED'
  | 'ALREADY_IN_ROOM'
  | 'NOT_IN_ROOM'
  | 'FORBIDDEN'
  | 'PARTICIPANT_NOT_FOUND'
  | 'IDENTITY_IN_USE'
  | 'INVALID_RESUME_TOKEN'
  | 'RATE_LIMITED'
  | 'SIGNAL_TOO_LARGE';

export interface RoomErrorPayload {
  code: RoomErrorCode;
  message: string;
}

export type RoomAck<T> =
  | { ok: true; data: T }
  | { ok: false; error: RoomErrorPayload };

export interface RoomIdentityRequest {
  participantId: string;
  displayName: string;
}

export interface JoinRoomRequest extends RoomIdentityRequest {
  roomCode: string;
}

export interface ResumeRoomRequest {
  roomCode: string;
  participantId: string;
  resumeToken: string;
}

export interface RoomSessionData {
  snapshot: RoomSnapshot;
  resumeToken: string;
}

/** Credenciales TURN efímeras emitidas únicamente a un miembro autenticado de la sala. */
export interface RoomIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface RoomIceConfig {
  iceServers: RoomIceServer[];
  expiresAt: number;
}

export interface ModerateParticipantRequest {
  participantId: string;
}

export interface PeerSignalPayload {
  type: 'offer' | 'answer' | 'ice';
  data: unknown;
}

export interface SendPeerSignalRequest {
  targetParticipantId: string;
  signal: PeerSignalPayload;
}

export interface ReceivedPeerSignal {
  fromParticipantId: string;
  signal: PeerSignalPayload;
}

/** Contrato del DataChannel P2P. El servidor nunca recibe estos mensajes. */
export type RoomControlCommand =
  | { version: 1; sequence: number; sentAt: number; type: 'stop' }
  | { version: 1; sequence: number; sentAt: number; type: 'pattern'; value: number }
  | { version: 1; sequence: number; sentAt: number; type: 'intensity'; value: number };

export interface ClientToServerEvents {
  'room:create': (request: RoomIdentityRequest, ack: (response: RoomAck<RoomSessionData>) => void) => void;
  'room:join': (request: JoinRoomRequest, ack: (response: RoomAck<RoomSessionData>) => void) => void;
  'room:resume': (request: ResumeRoomRequest, ack: (response: RoomAck<RoomSessionData>) => void) => void;
  'room:leave': (ack: (response: RoomAck<{ left: true }>) => void) => void;
  'room:kick': (request: ModerateParticipantRequest, ack: (response: RoomAck<RoomSnapshot>) => void) => void;
  'room:block': (request: ModerateParticipantRequest, ack: (response: RoomAck<RoomSnapshot>) => void) => void;
  'room:end': (ack: (response: RoomAck<{ ended: true }>) => void) => void;
  'room:ice': (ack: (response: RoomAck<RoomIceConfig>) => void) => void;
  'peer:signal': (request: SendPeerSignalRequest, ack: (response: RoomAck<{ delivered: true }>) => void) => void;
}

export interface ServerToClientEvents {
  'room:snapshot': (snapshot: RoomSnapshot) => void;
  'room:removed': (event: { reason: RoomRemovedReason }) => void;
  'room:ended': (event: { reason: RoomEndedReason }) => void;
  'peer:signal': (event: ReceivedPeerSignal) => void;
}

export type InterServerEvents = Record<never, never>;

export interface RoomSocketData {
  roomCode?: string;
  participantId?: string;
  role?: RoomRole;
}
