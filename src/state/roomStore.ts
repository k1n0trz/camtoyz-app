import { create } from 'zustand';

import { roomClient, type RoomConnectionState } from '@/features/room/RoomClient';
import { RoomPeerController } from '@/features/room/RoomPeerController';
import { useBleStore } from '@/state/bleStore';
import type { RoomEndedReason, RoomParticipant, RoomRemovedReason, RoomSnapshot } from '../../shared/roomProtocol';

interface RoomStore {
  connectionState: RoomConnectionState;
  room?: RoomSnapshot;
  participantId?: string;
  error?: string;
  removedReason?: RoomRemovedReason;
  endedReason?: RoomEndedReason;
  connectedPeers: number;
  totalPeers: number;
  peerError?: string;
  createRoom: (displayName?: string) => Promise<boolean>;
  joinRoom: (roomCode: string, displayName?: string) => Promise<boolean>;
  restoreRoom: () => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  kick: (participantId: string) => Promise<boolean>;
  block: (participantId: string) => Promise<boolean>;
  endRoom: () => Promise<boolean>;
  sendPattern: (pattern: number) => Promise<boolean>;
  sendIntensity: (value: number) => Promise<boolean>;
  sendStop: () => Promise<boolean>;
  clearOutcome: () => void;
  clearError: () => void;
}

const roomPeers = new RoomPeerController(
  (targetParticipantId, signal) => roomClient.sendPeerSignal(targetParticipantId, signal),
  async (command) => {
    const ble = useBleStore.getState();
    if (command.type === 'stop') await ble.stop();
    else if (command.type === 'pattern') await ble.setPattern(command.value);
    else await ble.setIntensity(command.value);
  },
  async () => {
    const ble = useBleStore.getState();
    if (ble.connectionState === 'connected') await ble.stop();
  },
);

async function safely(action: () => Promise<unknown>): Promise<boolean> {
  try {
    await action();
    return true;
  } catch {
    return false;
  }
}

export const useRoomStore = create<RoomStore>(() => ({
  connectionState: roomClient.snapshot.connectionState,
  room: roomClient.snapshot.room,
  participantId: roomClient.snapshot.participantId,
  error: roomClient.snapshot.error,
  removedReason: roomClient.snapshot.removedReason,
  endedReason: roomClient.snapshot.endedReason,
  connectedPeers: roomPeers.snapshot.connectedPeers,
  totalPeers: roomPeers.snapshot.totalPeers,
  peerError: roomPeers.snapshot.error,
  createRoom: (displayName) => safely(() => roomClient.create(displayName)),
  joinRoom: (roomCode, displayName) => safely(() => roomClient.join(roomCode, displayName)),
  restoreRoom: () => roomClient.restore(),
  leaveRoom: () => roomClient.leave(),
  kick: (participantId) => safely(() => roomClient.kick(participantId)),
  block: (participantId) => safely(() => roomClient.block(participantId)),
  endRoom: () => safely(() => roomClient.end()),
  sendPattern: (pattern) => safely(() => roomPeers.sendPattern(pattern)),
  sendIntensity: (value) => safely(() => roomPeers.sendIntensity(value)),
  sendStop: () => safely(() => roomPeers.sendStop()),
  clearOutcome: () => roomClient.clearOutcome(),
  clearError: () => roomClient.clearError(),
}));

roomClient.subscribe((snapshot) => {
  useRoomStore.setState(snapshot);
  void roomPeers.sync(snapshot.room, snapshot.participantId);
});
roomClient.subscribePeerSignals((signal) => void roomPeers.receiveSignal(signal));
roomPeers.subscribe((snapshot) => useRoomStore.setState({
  connectedPeers: snapshot.connectedPeers,
  totalPeers: snapshot.totalPeers,
  peerError: snapshot.error,
}));

export function currentParticipant(room?: RoomSnapshot, participantId?: string): RoomParticipant | undefined {
  return room?.participants.find((participant) => participant.id === participantId);
}
