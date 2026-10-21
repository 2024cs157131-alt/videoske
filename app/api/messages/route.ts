import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';

// GET /api/messages?with=<userId>&after=<ISO date>
export async function GET(req: NextRequest) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const me = r.user.id;
  const other = req.nextUrl.searchParams.get('with');
  const after = req.nextUrl.searchParams.get('after');
  if (!other) return bad('Missing ?with=');

  const between = {
    OR: [
      { senderId: me, receiverId: other },
      { senderId: other, receiverId: me },
    ],
  };

  const messages = after
    ? await prisma.message.findMany({
        where: { ...between, createdAt: { gt: new Date(after) } },
        orderBy: { createdAt: 'asc' },
        take: 200,
      })
    : (await prisma.message.findMany({ where: between, orderBy: { createdAt: 'desc' }, take: 100 })).reverse();

  await prisma.message.updateMany({
    where: { senderId: other, receiverId: me, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const b = await readJson(req);
  const to = String(b.to ?? '');
  const body = String(b.body ?? '').trim();
  if (!body || body.length > 2000) return bad('Messages must be 1–2000 characters.');
  if (to === r.user.id) return bad("You can't message yourself.");

  const recipient = await prisma.user.findUnique({ where: { id: to } });
  if (!recipient || recipient.banned) return bad('User not found.', 404);
  if (recipient.managedByAdmin) return bad('This profile does not accept messages.');

  const message = await prisma.message.create({ data: { senderId: r.user.id, receiverId: to, body } });
  return NextResponse.json({ message });
}
