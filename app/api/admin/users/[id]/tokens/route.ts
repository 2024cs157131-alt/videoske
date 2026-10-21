import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';

// Admin adds tokens to a user's wallet (support, promotions, refunds)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser(true);
  if ('error' in r) return r.error;
  const b = await readJson(req);
  const tokens = parseInt(String(b.tokens ?? ''), 10);
  if (!(tokens > 0 && tokens <= 1_000_000)) return bad('Enter a positive number of tokens.');
  const note = String(b.note ?? '').trim().slice(0, 200) || 'Added by admin';

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return bad('User not found.', 404);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { tokenBalance: { increment: tokens } } }),
    prisma.ledgerEntry.create({ data: { userId: user.id, type: 'ADMIN_CREDIT', tokens, note } }),
  ]);
  return NextResponse.json({ ok: true });
}
