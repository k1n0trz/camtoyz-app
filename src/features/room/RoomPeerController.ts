import {
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
} from 'react-native-webrtc';

import type {
  PeerSignalPayload,
  ReceivedPeerSignal,
  RoomControlCommand,
  RoomIceConfig,
  RoomSnapshot,
} from '../../../shared/roomProtocol';

type DataChannel = ReturnType<RTCPeerConnection['createDataChannel']>;

interface PeerEntry {
  connection: RTCPeerConnection;
  channel?: DataChannel;
  pendingCandidates: unknown[];
  offerStarted: boolean;
  lastSequence: number;
}

export interface RoomPeerSnapshot {
  connectedPeers: number;
  totalPeers: number;
  error?: string;
}

type SignalSender = (targetParticipantId: string, signal: PeerSignalPayload) => Promise<void>;
type CommandReceiver = (command: RoomControlCommand) => Promise<void>;
type Listener = (snapshot: RoomPeerSnapshot) => void;

const CHANNEL_LABEL = 'camtoyz-app-v1';
const MAX_COMMAND_BYTES = 512;
const MAX_COMMAND_AGE_MS = 10_000;

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

export class RoomPeerController {
  private peers = new Map<string, PeerEntry>();
  private listeners = new Set<Listener>();
  private latestRoom?: RoomSnapshot;
  private participantId?: string;
  private acceptsCommands = false;
  private iceServers: RoomIceConfig['iceServers'] = [];
  private sequence = 0;
  private lastIntensityAt = 0;
  private pendingIntensity?: number;
  private intensityTimer?: ReturnType<typeof setTimeout>;
  private state: RoomPeerSnapshot = { connectedPeers: 0, totalPeers: 0 };

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
    this.acceptsCommands = me?.role === 'host';

    if (!room || !participantId) {
      await this.closeAll(true);
      return;
    }

    const desired = room.participants.filter((participant) => participant.id !== participantId && participant.connected);
    const desiredIds = new Set(desired.map((participant) => participant.id));
    for (const peerId of this.peers.keys()) {
      if (!desiredIds.has(peerId)) this.closePeer(peerId, true);
    }
    for (const participant of desired) {
      const entry = this.ensurePeer(participant.id);
      if (participantId.localeCompare(participant.id) < 0 && !entry.offerStarted) {
        entry.offerStarted = true;
        this.attachChannel(participant.id, entry, entry.connection.createDataChannel(CHANNEL_LABEL, { ordered: true }));
        void this.createOffer(participant.id, entry);
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
        await entry.connection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: description.sdp }));
        await this.flushCandidates(entry);
        const answer = await entry.connection.createAnswer();
        await entry.connection.setLocalDescription(answer);
        await this.sendSignal(event.fromParticipantId, { type: 'answer', data: entry.connection.localDescription?.toJSON() ?? answer });
      } else if (event.signal.type === 'answer') {
        const description = event.signal.data as { type?: string; sdp?: string };
        if (description.type !== 'answer' || typeof description.sdp !== 'string') return;
        await entry.connection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: description.sdp }));
        await this.flushCandidates(entry);
      } else {
        if (!event.signal.data || typeof event.signal.data !== 'object') return;
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

  private ensurePeer(peerId: string): PeerEntry {
    const existing = this.peers.get(peerId);
    if (existing) return existing;

    const connection = new RTCPeerConnection({ iceServers: this.iceServers });
    const entry: PeerEntry = { connection, pendingCandidates: [], offerStarted: false, lastSequence: -1 };
    this.peers.set(peerId, entry);
    connection.addEventListener('icecandidate', (event) => {
      if (event.candidate) void this.sendSignal(peerId, { type: 'ice', data: event.candidate.toJSON() });
    });
    connection.addEventListener('datachannel', (event) => this.attachChannel(peerId, entry, event.channel));
    connection.addEventListener('connectionstatechange', () => {
      if (connection.connectionState === 'failed' || connection.connectionState === 'closed') {
        this.closePeer(peerId, true);
      }
      if (connection.connectionState === 'disconnected') void this.safeStop();
      this.notify();
    });
    this.notify();
    return entry;
  }

  private attachChannel(peerId: string, entry: PeerEntry, channel: DataChannel): void {
    entry.channel = channel;
    channel.addEventListener('open', () => {
      this.update({ error: undefined });
      this.notify();
    });
    channel.addEventListener('close', () => {
      void this.safeStop();
      this.notify();
    });
    channel.addEventListener('error', () => this.update({ error: 'El canal directo de control tuvo un error.' }));
    channel.addEventListener('message', (event) => {
      if (!this.acceptsCommands || typeof event.data !== 'string' || event.data.length > MAX_COMMAND_BYTES) return;
      try {
        const command = controlCommand(JSON.parse(event.data));
        if (!command || command.sequence <= entry.lastSequence) return;
        entry.lastSequence = command.sequence;
        void this.receiveCommand(command);
      } catch {
        // Mensaje ajeno o inválido: se descarta sin afectar la sesión.
      }
    });
  }

  private async createOffer(peerId: string, entry: PeerEntry): Promise<void> {
    try {
      const offer = await entry.connection.createOffer({});
      await entry.connection.setLocalDescription(offer);
      await this.sendSignal(peerId, { type: 'offer', data: entry.connection.localDescription?.toJSON() ?? offer });
    } catch {
      this.update({ error: 'No fue posible iniciar el canal directo de control.' });
      this.closePeer(peerId, true);
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
    entry.connection.close();
    this.peers.delete(peerId);
    if (stop) void this.safeStop();
    this.notify();
  }

  private async closeAll(stop: boolean): Promise<void> {
    for (const entry of this.peers.values()) {
      entry.channel?.close();
      entry.connection.close();
    }
    this.peers.clear();
    if (stop) await this.safeStop();
    this.notify();
  }

  private notify(): void {
    this.update({
      totalPeers: this.peers.size,
      connectedPeers: [...this.peers.values()].filter((entry) => entry.channel?.readyState === 'open').length,
    });
  }
}
