import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';

// Start a live stream (optionally paid: ticketPrice in tokens)
export async function POST(req: Request) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const b = await readJson(req);
  const title = String(b.title ?? '').trim();
  const ticketPrice = parseInt(String(b.ticketPrice ?? '0'), 10) || 0;
  if (title.length < 3 || title.length > 100) return bad('Give your stream a title (3–100 characters).');
  if (ticketPrice < 0 || ticketPrice > 100000) return bad('Ticket price must be 0–100,000 tokens.');
  if (b.consent !== true) return bad('Confirm your stream will follow the content rules.');
  if (!process.env.LIVEKIT_API_KEY) return bad('Live streaming is not configured yet.', 503);

  await prisma.liveStream.updateMany({
    where: { hostId: r.user.id, isLive: true },
    data: { isLive: false, endedAt: new Date() },
  });
  const stream = await prisma.liveStream.create({
    data: { title, ticketPrice, hostId: r.user.id, roomName: `room_${randomUUID()}` },
  });
  return NextResponse.json({ id: stream.id });
}
