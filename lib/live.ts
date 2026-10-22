import { prisma } from './db';

/** A stream whose host hasn't sent a heartbeat for this long is treated as ended (closed tab, lost connection). */
export const STALE_MS = 2 * 60_000;

let lastSweep = 0;

/** Ends streams whose host disappeared. Runs at most every 30s per server instance (it's a database write). */
export async function endStaleStreams() {
  if (Date.now() - lastSweep < 30_000) return;
  lastSweep = Date.now();
  await prisma.liveStream.updateMany({
    where: { isLive: true, lastSeenAt: { lt: new Date(Date.now() - STALE_MS) } },
    data: { isLive: false, endedAt: new Date() },
  });
}

/** Streams the public can see: live, approved, host not banned. */
export const visibleLiveWhere = { isLive: true, status: 'APPROVED' as const, host: { banned: false } };
