import { NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { prisma } from '@/lib/db';
import { bad, requireApiUser } from '@/lib/api';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;

  const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, NEXT_PUBLIC_LIVEKIT_URL } = process.env;
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !NEXT_PUBLIC_LIVEKIT_URL) {
    return bad('Live streaming is not configured yet.', 503);
  }

  const stream = await prisma.liveStream.findUnique({ where: { id: params.id } });
  if (!stream || !stream.isLive) return bad('This stream has ended.', 404);

  const isHost = stream.hostId === r.user.id;
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: r.user.id,
    name: r.user.displayName,
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
