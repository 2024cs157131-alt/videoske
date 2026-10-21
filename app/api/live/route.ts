import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';

// Start a live stream
export async function POST(req: Request) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const b = await readJson(req);
  const title = String(b.title ?? '').trim();
  if (title.length < 3 || title.length > 100) return bad('Give your stream a title (3–100 characters).');
  if (!process.env.LIVEKIT_API_KEY) return bad('Live streaming is not configured yet.', 503);

  await prisma.liveStream.updateMany({
    where: { hostId: r.user.id, isLive: true },
    data: { isLive: false, endedAt: new Date() },
  });
  const stream = await prisma.liveStream.create({
    data: { title, hostId: r.user.id, roomName: `room_${randomUUID()}` },
  });
  return NextResponse.json({ id: stream.id });
}
