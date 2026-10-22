import { NextResponse } from 'next/server';
import { notifyLive } from '@/lib/notify';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';
import { getSettings } from '@/lib/settings';

// Start a live stream (optionally paid: ticketPrice in tokens).
// It starts PENDING: the host and admins can join, viewers can join once an admin approves it.
export async function POST(req: Request) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const b = await readJson(req);
  const title = String(b.title ?? '').trim();
  const ticketPrice = parseInt(String(b.ticketPrice ?? '0'), 10) || 0;
  if (title.length < 3 || title.length > 100) return bad('Give your stream a title (3–100 characters).');
  if (ticketPrice < 0 || ticketPrice > 100000) return bad('Ticket price must be 0–100,000 tokens.');
  if (ticketPrice > 0 && !r.user.verified && r.user.role !== 'ADMIN') {
    return bad('Only verified creators can charge for live streams. Get verified first, or set the ticket to 0.', 403);
  }
  if (!process.env.LIVEKIT_API_KEY) return bad('Live streaming is not configured yet.', 503);

  await prisma.liveStream.updateMany({
    where: { hostId: r.user.id, isLive: true },
    data: { isLive: false, endedAt: new Date() },
  });
  const stream = await prisma.liveStream.create({
    data: {
      title,
      ticketPrice,
      hostId: r.user.id,
      roomName: `room_${randomUUID()}`,
      status: r.user.role === 'ADMIN' || (await getSettings()).auto_approve_live === 'true' ? 'APPROVED' : 'PENDING',
    },
  });
  const notified = stream.status === 'APPROVED' ? await notifyLive(stream.id) : 0;
  return NextResponse.json({ id: stream.id, notified });
}
