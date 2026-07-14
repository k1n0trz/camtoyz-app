import { createRoomServer } from './createRoomServer';

function readPositiveInt(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function readCsv(name: string): string[] {
  return (process.env[name] ?? '').split(',').map((value) => value.trim()).filter(Boolean);
}

async function main(): Promise<void> {
  const port = readPositiveInt('PORT', 8787);
  const allowedOrigins = readCsv('ROOM_ALLOWED_ORIGINS');
  const server = createRoomServer({
    allowedOrigins,
    maxParticipants: readPositiveInt('ROOM_MAX_PARTICIPANTS', 2),
    roomTtlMs: readPositiveInt('ROOM_TTL_MS', 6 * 60 * 60 * 1000),
    recoveryWindowMs: readPositiveInt('ROOM_RECOVERY_WINDOW_MS', 30_000),
    turnUrls: readCsv('TURN_URLS'),
    turnSharedSecret: process.env.TURN_SHARED_SECRET,
    turnCredentialTtlMs: readPositiveInt('TURN_CREDENTIAL_TTL_MS', 60 * 60 * 1_000),
  });
  await server.listen(port, '0.0.0.0');

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

void main().catch((error) => {
  console.error('Room server failed to start.', error);
  process.exit(1);
});
