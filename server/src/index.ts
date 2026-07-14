import { createRoomServer } from './createRoomServer';

function readPositiveInt(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

async function main(): Promise<void> {
  const port = readPositiveInt('PORT', 8787);
  const allowedOrigins = (process.env.ROOM_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const server = createRoomServer({
    allowedOrigins,
    maxParticipants: readPositiveInt('ROOM_MAX_PARTICIPANTS', 8),
    roomTtlMs: readPositiveInt('ROOM_TTL_MS', 6 * 60 * 60 * 1000),
    recoveryWindowMs: readPositiveInt('ROOM_RECOVERY_WINDOW_MS', 30_000),
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
