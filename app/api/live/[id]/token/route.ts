import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { prisma } from '@/lib/db';
import { bad, requireApiUser } from '@/lib/api';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const user = r.user;

  const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, NEXT_PUBLIC_LIVEKIT_URL } = process.env;
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !NEXT_PUBLIC_LIVEKIT_URL) {
    return bad('Live streaming is not configured yet.', 503);
  }

  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream || !stream.isLive) return bad('This stream has ended.', 404);

  const isHost = stream.hostId === user.id;
  if (stream.ticketPrice > 0 && !isHost && user.role !== 'ADMIN') {
    const ticket = await prisma.liveTicket.findUnique({ where: { userId_streamId: { userId: user.id, streamId: stream.id } } });
    if (!ticket) return bad('Buy a ticket to join this stream.', 402);
  }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: user.id,
    name: user.displayName,
    ttl: '2h',
  });
  at.addGrant({
    roomJoin: true,
    room: stream.roomName,
    canPublish: isHost, // only the host broadcasts camera/mic
    canSubscribe: true,
    canPublishData: true, // everyone can use live chat
  });

  return NextResponse.json({ token: await at.toJwt(), url: NEXT_PUBLIC_LIVEKIT_URL, isHost });
}
