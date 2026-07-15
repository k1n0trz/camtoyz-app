import { PermissionsAndroid, Platform } from 'react-native';
import {
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  mediaDevices,
} from 'react-native-webrtc';

import type {
  PeerSignalPayload,
  ReceivedPeerSignal,
  RoomControlCommand,
  RoomControlPermission,
  RoomIceConfig,
  RoomSnapshot,
} from '../../../shared/roomProtocol';

type DataChannel = ReturnType<RTCPeerConnection['createDataChannel']>;

interface PeerEntry {
  connection: RTCPeerConnection;
  channel?: DataChannel;
  remoteStream?: MediaStream;
  pendingCandidates: unknown[];
  offerStarted: boolean;
  initialNegotiationComplete: boolean;
  isInitiator: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  lastSequence: number;
}

export interface RoomPeerSnapshot {
  connectedPeers: number;
  totalPeers: number;
  error?: string;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  isVideoStarting: boolean;
  mediaError?: string;
  remoteControlAllowed: boolean;
}

type SignalSender = (targetParticipantId: string, signal: PeerSignalPayload) => Promise<void>;
type CommandReceiver = (command: RoomControlCommand) => Promise<void>;
type Listener = (snapshot: RoomPeerSnapshot) => void;

const CHANNEL_LABEL = 'camtoyz-app-v1';
const MAX_COMMAND_BYTES = 512;
const MAX_COMMAND_AGE_MS = 10_000;

async function requestVideoPermissions(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ]);
  const granted = [PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]
    .every((permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED);
  if (!granted) throw new Error('Se necesitan permisos de cámara y micrófono para iniciar el video.');
}

function controlCommand(value: unknown): RoomControlCommand | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const command = value as Partial<RoomControlCommand> & { value?: unknown };
  if (command.version !== 1 || !Number.isSafeInteger(command.sequence) || typeof command.sentAt !== 'number') return undefined;
  if (Math.abs(Date.now() - command.sentAt) > MAX_COMMAND_AGE_MS) return undefined;
  if (command.type === 'stop') return command as RoomControlCommand;
  if (command.type === 'pattern' && Number.isInteger(command.value) && Number(command.value) >= 1 && Number(command.value) <= 64) return command as RoomControlCommand;
  if (command.type === 'intensity' && typeof command.value === 'number' && Number.isFinite(command.value) && command.value >= 0 && command.value <= 100) return command as RoomControlCommand;
  return undefined;
}

function controlPermission(value: unknown): RoomControlPermission | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const permission = value as Partial<RoomControlPermission>;
  if (permission.version !== 1 || permission.type !== 'control-permission' || typeof permission.allowed !== 'boolean') return undefined;
  return permission as RoomControlPermission;
}

export class RoomPeerController {
  private peers = new Map<string, PeerEntry>();
  private listeners = new Set<Listener>();
  private latestRoom?: RoomSnapshot;
  private participantId?: string;
  private sessionKey?: string;
  private acceptsCommands = false;
  private remoteControlAllowed = false;
  private iceServers: RoomIceConfig['iceServers'] = [];
  private localStream?: MediaStream;
  private sequence = 0;
  private lastIntensityAt = 0;
  private pendingIntensity?: number;
  private intensityTimer?: ReturnType<typeof setTimeout>;
  private state: RoomPeerSnapshot = {
    connectedPeers: 0,
    totalPeers: 0,
    cameraEnabled: false,
    microphoneEnabled: false,
    isVideoStarting: false,
    remoteControlAllowed: false,
  };

  constructor(
    private readonly sendSignal: SignalSender,
    private readonly receiveCommand: CommandReceiver,
    private readonly safeStop: () => Promise<void>,
  ) {}

  get snapshot(): RoomPeerSnapshot {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  setIceConfig(config?: RoomIceConfig): void {
    this.iceServers = config?.iceServers ?? [];
  }

  private update(next: Partial<RoomPeerSnapshot>): void {
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener(this.state);
  }

  async sync(room?: RoomSnapshot, participantId?: string): Promise<void> {
    this.latestRoom = room;
    this.participantId = participantId;
    const me = room?.participants.find((participant) => participant.id === participantId);
    const nextSessionKey = room && participantId ? `${room.code}:${participantId}` : undefined;
    if (this.sessionKey !== nextSessionKey) {
      this.sessionKey = nextSessionKey;
      this.remoteControlAllowed = false;
      this.update({ remoteControlAllowed: false });
    }
    this.acceptsCommands = me?.role === 'host';

    if (!room || !participantId) {
      await this.closeAll(true);
      await this.stopVideo();
      return;
    }

    const desired = room.participants.filter((participant) => participant.id !== participantId && participant.connected);
    const desiredIds = new Set(desired.map((participant) => participant.id));
    for (const peerId of this.peers.keys()) {
      if (!desiredIds.has(peerId)) this.closePeer(peerId, true);
    }
    for (const participant of desired) {
      const entry = this.ensurePeer(participant.id);
      if (entry.isInitiator && !entry.offerStarted) {
        entry.offerStarted = true;
        this.attachChannel(participant.id, entry, entry.connection.createDataChannel(CHANNEL_LABEL, { ordered: true }));
        this.attachLocalTracks(entry);
        void this.createOffer(participant.id, entry);
      } else {
        this.attachLocalTracks(entry);
      }
    }
    this.notify();
  }

  async receiveSignal(event: ReceivedPeerSignal): Promise<void> {
    if (!this.latestRoom?.participants.some((participant) => participant.id === event.fromParticipantId && participant.connected)) return;
    const entry = this.ensurePeer(event.fromParticipantId);
    try {
      if (event.signal.type === 'offer') {
        const description = event.signal.data as { type?: string; sdp?: string };
        if (description.type !== 'offer' || typeof description.sdp !== 'string') return;
        const offerCollision = entry.makingOffer || entry.connection.signalingState !== 'stable';
        entry.ignoreOffer = entry.isInitiator && offerCollision;
        if (entry.ignoreOffer) return;
        if (offerCollision) await entry.connection.setLocalDescription(new RTCSessionDescription({ type: 'rollback', sdp: '' }));
        await entry.connection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: description.sdp }));
        await this.flushCandidates(entry);
        const answer = await entry.connection.createAnswer();
        await entry.connection.setLocalDescription(answer);
        entry.initialNegotiationComplete = true;
        await this.sendSignal(event.fromParticipantId, { type: 'answer', data: entry.connection.localDescription?.toJSON() ?? answer });
      } else if (event.signal.type === 'answer') {
        const description = event.signal.data as { type?: string; sdp?: string };
        if (description.type !== 'answer' || typeof description.sdp !== 'string') return;
        await entry.connection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: description.sdp }));
        await this.flushCandidates(entry);
        entry.initialNegotiationComplete = true;
      } else {
        if (!event.signal.data || typeof event.signal.data !== 'object') return;
        if (entry.ignoreOffer) return;
        if (!entry.connection.remoteDescription) entry.pendingCandidates.push(event.signal.data);
        else await entry.connection.addIceCandidate(new RTCIceCandidate(event.signal.data as never));
      }
    } catch {
      this.update({ error: 'No fue posible establecer el canal directo de control.' });
      this.closePeer(event.fromParticipantId, true);
    }
  }

  async sendPattern(pattern: number): Promise<void> {
    return this.send({ version: 1, sequence: ++this.sequence, sentAt: Date.now(), type: 'pattern', value: pattern });
  }

  async sendIntensity(value: number): Promise<void> {
    const now = Date.now();
    const rounded = Math.round(value);
    if (now - this.lastIntensityAt >= 40) return this.sendIntensityNow(rounded);
    this.pendingIntensity = rounded;
    if (!this.intensityTimer) {
      this.intensityTimer = setTimeout(() => {
        this.intensityTimer = undefined;
        const pending = this.pendingIntensity;
        this.pendingIntensity = undefined;
        if (pending !== undefined) void this.sendIntensityNow(pending);
      }, 40 - (now - this.lastIntensityAt));
    }
  }

  async sendStop(): Promise<void> {
    if (this.intensityTimer) clearTimeout(this.intensityTimer);
    this.intensityTimer = undefined;
    this.pendingIntensity = undefined;
    return this.send({ version: 1, sequence: ++this.sequence, sentAt: Date.now(), type: 'stop' });
  }

  async setRemoteControlAllowed(allowed: boolean): Promise<void> {
    if (!this.acceptsCommands) return;
    this.remoteControlAllowed = allowed;
    this.update({ remoteControlAllowed: allowed });
    this.broadcastPermission();
    if (!allowed) await this.safeStop();
  }

  async emergencyStop(): Promise<void> {
    this.remoteControlAllowed = false;
    this.update({ remoteControlAllowed: false });
    if (this.acceptsCommands) this.broadcastPermission();
    await this.safeStop();
  }

  async suspendForSafety(): Promise<void> {
    if (this.acceptsCommands) {
      await this.setRemoteControlAllowed(false);
    } else {
      try {
        await this.sendStop();
      } catch {
        // Si el canal ya cayó, el receptor también ejecuta Stop al detectar el cierre.
      }
    }
    await this.safeStop();
    await this.stopVideo();
  }

  async startVideo(): Promise<void> {
    if (this.localStream || this.state.isVideoStarting) return;
    this.update({ isVideoStarting: true, mediaError: undefined });
    try {
      await requestVideoPermissions();
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: 'user',
          frameRate: 24,
          width: 640,
          height: 480,
        },
      });
      this.localStream = stream;
      for (const entry of this.peers.values()) this.attachLocalTracks(entry);
      this.update({
        localStream: stream,
        cameraEnabled: true,
        microphoneEnabled: true,
        isVideoStarting: false,
        mediaError: undefined,
      });
      this.notify();
    } catch (error) {
      this.update({
        isVideoStarting: false,
        mediaError: error instanceof Error ? error.message : 'No fue posible iniciar la cámara.',
      });
    }
  }

  async stopVideo(): Promise<void> {
    const stream = this.localStream;
    if (!stream) return;
    this.localStream = undefined;
    const trackIds = new Set(stream.getTracks().map((track) => track.id));
    for (const entry of this.peers.values()) {
      for (const sender of entry.connection.getSenders()) {
        if (sender.track && trackIds.has(sender.track.id)) entry.connection.removeTrack(sender);
      }
    }
    for (const track of stream.getTracks()) track.stop();
    stream.release();
    this.update({
      localStream: undefined,
      cameraEnabled: false,
      microphoneEnabled: false,
      isVideoStarting: false,
      mediaError: undefined,
    });
  }

  toggleCamera(): void {
    const tracks = this.localStream?.getVideoTracks() ?? [];
    if (!tracks.length) {
      this.update({ mediaError: 'Activa la cámara antes de cambiar el video.' });
      return;
    }
    const enabled = !tracks.every((track) => track.enabled);
    for (const track of tracks) track.enabled = enabled;
    this.update({ cameraEnabled: enabled, mediaError: undefined });
  }

  toggleMicrophone(): void {
    const tracks = this.localStream?.getAudioTracks() ?? [];
    if (!tracks.length) {
      this.update({ mediaError: 'Activa la cámara antes de cambiar el micrófono.' });
      return;
    }
    const enabled = !tracks.every((track) => track.enabled);
    for (const track of tracks) track.enabled = enabled;
    this.update({ microphoneEnabled: enabled, mediaError: undefined });
  }

  switchCamera(): void {
    const track = this.localStream?.getVideoTracks()[0];
    if (!track) {
      this.update({ mediaError: 'Activa la cámara antes de cambiarla.' });
      return;
    }
    try {
      track._switchCamera();
      this.update({ mediaError: undefined });
    } catch {
      this.update({ mediaError: 'No fue posible cambiar de cámara en este dispositivo.' });
    }
  }

  private async sendIntensityNow(value: number): Promise<void> {
    this.lastIntensityAt = Date.now();
    return this.send({ version: 1, sequence: ++this.sequence, sentAt: Date.now(), type: 'intensity', value });
  }

  private async send(command: RoomControlCommand): Promise<void> {
    const payload = JSON.stringify(command);
    const open = [...this.peers.values()].map((entry) => entry.channel).filter((channel): channel is DataChannel => channel?.readyState === 'open');
    if (!open.length) throw new Error('El canal directo todavía no está listo.');
    for (const channel of open) channel.send(payload);
  }

  private broadcastPermission(): void {
    const payload = JSON.stringify({ version: 1, type: 'control-permission', allowed: this.remoteControlAllowed } satisfies RoomControlPermission);
    for (const entry of this.peers.values()) {
      if (entry.channel?.readyState === 'open') entry.channel.send(payload);
    }
  }

  private ensurePeer(peerId: string): PeerEntry {
    const existing = this.peers.get(peerId);
    if (existing) return existing;

    const connection = new RTCPeerConnection({ iceServers: this.iceServers });
    const isInitiator = Boolean(this.participantId && this.participantId.localeCompare(peerId) < 0);
    const entry: PeerEntry = {
      connection,
      pendingCandidates: [],
      offerStarted: false,
      initialNegotiationComplete: false,
      isInitiator,
      makingOffer: false,
      ignoreOffer: false,
      lastSequence: -1,
    };
    this.peers.set(peerId, entry);
    connection.addEventListener('icecandidate', (event) => {
      if (event.candidate) void this.sendSignal(peerId, { type: 'ice', data: event.candidate.toJSON() });
    });
    connection.addEventListener('datachannel', (event) => this.attachChannel(peerId, entry, event.channel));
    connection.addEventListener('track', (event) => {
      if (event.streams[0]) entry.remoteStream = event.streams[0];
      else if (event.track) {
        entry.remoteStream ??= new MediaStream();
        entry.remoteStream.addTrack(event.track);
      }
      this.notify();
    });
    connection.addEventListener('negotiationneeded', () => {
      if (entry.initialNegotiationComplete) void this.createOffer(peerId, entry);
    });
    connection.addEventListener('connectionstatechange', () => {
      if (connection.connectionState === 'failed' || connection.connectionState === 'closed') {
        this.closePeer(peerId, true);
      }
      if (connection.connectionState === 'disconnected') this.revokeForDisconnect();
      this.notify();
    });
    this.notify();
    return entry;
  }

  private attachLocalTracks(entry: PeerEntry): void {
    if (!this.localStream) return;
    for (const track of this.localStream.getTracks()) {
      if (!entry.connection._trackExists(track)) entry.connection.addTrack(track, this.localStream);
    }
  }

  private attachChannel(peerId: string, entry: PeerEntry, channel: DataChannel): void {
    entry.channel = channel;
    channel.addEventListener('open', () => {
      this.update({ error: undefined });
      if (this.acceptsCommands) this.broadcastPermission();
      this.notify();
    });
    channel.addEventListener('close', () => {
      this.revokeForDisconnect();
      this.notify();
    });
    channel.addEventListener('error', () => this.update({ error: 'El canal directo de control tuvo un error.' }));
    channel.addEventListener('message', (event) => {
      if (typeof event.data !== 'string' || event.data.length > MAX_COMMAND_BYTES) return;
      try {
        const value: unknown = JSON.parse(event.data);
        const permission = controlPermission(value);
        if (permission) {
          if (!this.acceptsCommands) {
            this.remoteControlAllowed = permission.allowed;
            this.update({ remoteControlAllowed: permission.allowed });
          }
          return;
        }
        if (!this.acceptsCommands) return;
        const command = controlCommand(value);
        if (!command || command.sequence <= entry.lastSequence) return;
        if (command.type !== 'stop' && !this.remoteControlAllowed) return;
        entry.lastSequence = command.sequence;
        void this.receiveCommand(command);
      } catch {
        // Mensaje ajeno o inválido: se descarta sin afectar la sesión.
      }
    });
  }

  private async createOffer(peerId: string, entry: PeerEntry): Promise<void> {
    if (entry.makingOffer || entry.connection.signalingState !== 'stable') return;
    try {
      entry.makingOffer = true;
      const offer = await entry.connection.createOffer({});
      await entry.connection.setLocalDescription(offer);
      await this.sendSignal(peerId, { type: 'offer', data: entry.connection.localDescription?.toJSON() ?? offer });
    } catch {
      this.update({ error: 'No fue posible iniciar el canal directo de control.' });
      this.closePeer(peerId, true);
    } finally {
      entry.makingOffer = false;
    }
  }

  private async flushCandidates(entry: PeerEntry): Promise<void> {
    for (const candidate of entry.pendingCandidates.splice(0)) {
      await entry.connection.addIceCandidate(new RTCIceCandidate(candidate as never));
    }
  }

  private closePeer(peerId: string, stop: boolean): void {
    const entry = this.peers.get(peerId);
    if (!entry) return;
    entry.channel?.close();
    entry.remoteStream?.release();
    entry.connection.close();
    this.peers.delete(peerId);
    if (stop) this.revokeForDisconnect();
    this.notify();
  }

  private async closeAll(stop: boolean): Promise<void> {
    for (const entry of this.peers.values()) {
      entry.channel?.close();
      entry.remoteStream?.release();
      entry.connection.close();
    }
    this.peers.clear();
    this.remoteControlAllowed = false;
    this.update({ remoteControlAllowed: false });
    if (stop) await this.safeStop();
    this.notify();
  }

  private notify(): void {
    this.update({
      totalPeers: this.peers.size,
      connectedPeers: [...this.peers.values()].filter((entry) => entry.channel?.readyState === 'open').length,
      remoteStream: [...this.peers.values()].map((entry) => entry.remoteStream).find(Boolean),
    });
  }

  private revokeForDisconnect(): void {
    this.remoteControlAllowed = false;
    this.update({ remoteControlAllowed: false });
    void this.safeStop();
  }
}
