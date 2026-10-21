import { prisma } from './db';

/** A stream whose host hasn't sent a heartbeat for this long is treated as ended (closed tab, lost connection). */
export const STALE_MS = 2 * 60_000;

export async function endStaleStreams() {
  await prisma.liveStream.updateMany({
    where: { isLive: true, lastSeenAt: { lt: new Date(Date.now() - STALE_MS) } },
    data: { isLive: false, endedAt: new Date() },
  });
}

/** Streams the public can see: live, approved, host not banned. */
export const visibleLiveWhere = { isLive: true, status: 'APPROVED' as const, host: { banned: false } };
