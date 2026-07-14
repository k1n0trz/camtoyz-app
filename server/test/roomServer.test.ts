import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { io as createClient, type Socket } from 'socket.io-client';

import type {
  ClientToServerEvents,
  JoinRoomRequest,
  RoomAck,
  RoomIdentityRequest,
  RoomSessionData,
  RoomSnapshot,
  ServerToClientEvents,
} from '../../shared/roomProtocol';
import { createRoomServer, type RunningRoomServer } from '../src/createRoomServer';

type TestClient = Socket<ServerToClientEvents, ClientToServerEvents>;

const HOST_ID = 'host_installation_0001';
const MEMBER_ID = 'member_installation_01';
const OTHER_ID = 'other_installation_001';

let server: RunningRoomServer;
let url: string;
let clients: TestClient[];

function silentLogger() {
  return { info: () => undefined, error: () => undefined };
}

async function connectClient(): Promise<TestClient> {
  const client = createClient(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  clients.push(client);
  await new Promise<void>((resolve, reject) => {
    client.once('connect', resolve);
    client.once('connect_error', reject);
  });
  return client;
}

function createRoom(client: TestClient, request: RoomIdentityRequest): Promise<RoomAck<RoomSessionData>> {
  return new Promise((resolve) => client.emit('room:create', request, resolve));
}

function joinRoom(client: TestClient, request: JoinRoomRequest): Promise<RoomAck<RoomSessionData>> {
  return new Promise((resolve) => client.emit('room:join', request, resolve));
}

function waitForRoomEnded(client: TestClient): Promise<{ reason: 'host_ended' | 'host_disconnected' | 'expired' }> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('No llegó el cierre de la sala.')), 2_500);
    client.once('room:ended', (event) => {
      clearTimeout(timer);
      resolve(event);
    });
  });
}

beforeEach(async () => {
  clients = [];
  server = createRoomServer({ recoveryWindowMs: 1_000, cleanupIntervalMs: 60_000, logger: silentLogger() });
  const port = await server.listen();
  url = `http://127.0.0.1:${port}`;
});

afterEach(async () => {
  for (const client of clients) client.disconnect();
  await server.close();
});

test('crea y une participantes con roles decididos por el servidor', async () => {
  const host = await connectClient();
  const member = await connectClient();
  const created = await createRoom(host, { participantId: HOST_ID, displayName: 'Anfitrión' });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const snapshotEvent = new Promise<RoomSnapshot>((resolve) => host.once('room:snapshot', resolve));
  const joined = await joinRoom(member, {
    roomCode: created.data.snapshot.code.toLowerCase(),
    participantId: MEMBER_ID,
    displayName: '  Invitada   Uno  ',
  });
  assert.equal(joined.ok, true);
  const snapshot = await snapshotEvent;
  assert.equal(snapshot.participants.length, 2);
  assert.equal(snapshot.participants[0].role, 'host');
  assert.equal(snapshot.participants[1].role, 'member');
  assert.equal(snapshot.participants[1].displayName, 'Invitada Uno');
});

test('impide moderación de miembros, bloquea y rechaza el reingreso', async () => {
  const host = await connectClient();
  const member = await connectClient();
  const attacker = await connectClient();
  const created = await createRoom(host, { participantId: HOST_ID, displayName: 'Host' });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const roomCode = created.data.snapshot.code;
  const joined = await joinRoom(member, { roomCode, participantId: MEMBER_ID, displayName: 'Member' });
  assert.equal(joined.ok, true);

  const forbidden = await new Promise<RoomAck<RoomSnapshot>>((resolve) => {
    member.emit('room:kick', { participantId: HOST_ID }, resolve);
  });
  assert.equal(forbidden.ok, false);
  if (!forbidden.ok) assert.equal(forbidden.error.code, 'FORBIDDEN');

  const removedEvent = new Promise<{ reason: 'kicked' | 'blocked' }>((resolve) => member.once('room:removed', resolve));
  const blocked = await new Promise<RoomAck<RoomSnapshot>>((resolve) => {
    host.emit('room:block', { participantId: MEMBER_ID }, resolve);
  });
  assert.equal(blocked.ok, true);
  assert.deepEqual(await removedEvent, { reason: 'blocked' });

  const rejoin = await joinRoom(attacker, { roomCode, participantId: MEMBER_ID, displayName: 'Same device' });
  assert.equal(rejoin.ok, false);
  if (!rejoin.ok) assert.equal(rejoin.error.code, 'BLOCKED');
});

test('reenvía solo señalización WebRTC al participante objetivo', async () => {
  const host = await connectClient();
  const member = await connectClient();
  const created = await createRoom(host, { participantId: HOST_ID, displayName: 'Host' });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const joined = await joinRoom(member, {
    roomCode: created.data.snapshot.code,
    participantId: MEMBER_ID,
    displayName: 'Member',
  });
  assert.equal(joined.ok, true);

  const received = new Promise<{ fromParticipantId: string; signal: { type: 'offer' | 'answer' | 'ice'; data: unknown } }>(
    (resolve) => member.once('peer:signal', resolve),
  );
  const delivered = await new Promise<RoomAck<{ delivered: true }>>((resolve) => {
    host.emit('peer:signal', {
      targetParticipantId: MEMBER_ID,
      signal: { type: 'offer', data: { sdp: 'private-p2p-offer' } },
    }, resolve);
  });
  assert.equal(delivered.ok, true);
  const event = await received;
  assert.equal(event.fromParticipantId, HOST_ID);
  assert.deepEqual(event.signal.data, { sdp: 'private-p2p-offer' });
});

test('terminar la sala notifica a todos los miembros', async () => {
  const host = await connectClient();
  const member = await connectClient();
  const created = await createRoom(host, { participantId: HOST_ID, displayName: 'Host' });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  await joinRoom(member, { roomCode: created.data.snapshot.code, participantId: MEMBER_ID, displayName: 'Member' });

  const endedEvent = new Promise<{ reason: 'host_ended' | 'host_disconnected' | 'expired' }>(
    (resolve) => member.once('room:ended', resolve),
  );
  const ended = await new Promise<RoomAck<{ ended: true }>>((resolve) => host.emit('room:end', resolve));
  assert.equal(ended.ok, true);
  assert.deepEqual(await endedEvent, { reason: 'host_ended' });
  assert.equal(server.registry.activeRoomCount, 0);
});

test('reanuda una sesión solo con el token secreto correcto', async () => {
  const host = await connectClient();
  const member = await connectClient();
  const created = await createRoom(host, { participantId: HOST_ID, displayName: 'Host' });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const joined = await joinRoom(member, {
    roomCode: created.data.snapshot.code,
    participantId: MEMBER_ID,
    displayName: 'Member',
  });
  assert.equal(joined.ok, true);
  if (!joined.ok) return;
  member.disconnect();

  const resumedClient = await connectClient();
  const rejected = await new Promise<RoomAck<RoomSessionData>>((resolve) => {
    resumedClient.emit('room:resume', {
      roomCode: created.data.snapshot.code,
      participantId: MEMBER_ID,
      resumeToken: 'token-invalido',
    }, resolve);
  });
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.equal(rejected.error.code, 'INVALID_RESUME_TOKEN');

  const resumed = await new Promise<RoomAck<RoomSessionData>>((resolve) => {
    resumedClient.emit('room:resume', {
      roomCode: created.data.snapshot.code,
      participantId: MEMBER_ID,
      resumeToken: joined.data.resumeToken,
    }, resolve);
  });
  assert.equal(resumed.ok, true);
  if (resumed.ok) {
    const participant = resumed.data.snapshot.participants.find(({ id }) => id === MEMBER_ID);
    assert.equal(participant?.connected, true);
  }
});

test('un token correcto recupera la misma sesión y reemplaza su socket anterior', async () => {
  const host = await connectClient();
  const replacement = await connectClient();
  const created = await createRoom(host, { participantId: HOST_ID, displayName: 'Host' });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const disconnected = new Promise<void>((resolve) => host.once('disconnect', () => resolve()));
  const resumed = await new Promise<RoomAck<RoomSessionData>>((resolve) => {
    replacement.emit('room:resume', {
      roomCode: created.data.snapshot.code,
      participantId: HOST_ID,
      resumeToken: created.data.resumeToken,
    }, resolve);
  });
  assert.equal(resumed.ok, true);
  await disconnected;
  if (resumed.ok) {
    const participant = resumed.data.snapshot.participants.find(({ id }) => id === HOST_ID);
    assert.equal(participant?.connected, true);
  }
});

test('cierra la sala si el anfitrión no vuelve dentro de la ventana de recuperación', async () => {
  const host = await connectClient();
  const member = await connectClient();
  const created = await createRoom(host, { participantId: HOST_ID, displayName: 'Host' });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  await joinRoom(member, { roomCode: created.data.snapshot.code, participantId: MEMBER_ID, displayName: 'Member' });

  const endedEvent = waitForRoomEnded(member);
  host.disconnect();
  assert.deepEqual(await endedEvent, { reason: 'host_disconnected' });
  assert.equal(server.registry.activeRoomCount, 0);
});

test('expone salud sin filtrar contenido de las salas', async () => {
  const response = await fetch(`${url}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, activeRooms: 0 });
});

test('respeta el límite de participantes', async () => {
  for (const client of clients) client.disconnect();
  await server.close();
  clients = [];
  server = createRoomServer({ maxParticipants: 2, logger: silentLogger() });
  const port = await server.listen();
  url = `http://127.0.0.1:${port}`;

  const host = await connectClient();
  const member = await connectClient();
  const other = await connectClient();
  const created = await createRoom(host, { participantId: HOST_ID, displayName: 'Host' });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  await joinRoom(member, { roomCode: created.data.snapshot.code, participantId: MEMBER_ID, displayName: 'Member' });
  const overflow = await joinRoom(other, { roomCode: created.data.snapshot.code, participantId: OTHER_ID, displayName: 'Other' });
  assert.equal(overflow.ok, false);
  if (!overflow.ok) assert.equal(overflow.error.code, 'ROOM_FULL');
});
