import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { readJson, requireApiUser } from '@/lib/api';

// Turn an ad on/off, or delete it ({ delete: true })
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser(true);
  if ('error' in r) return r.error;
  const b = await readJson(req);

  if (b.delete === true) await prisma.ad.delete({ where: { id: params.id } });
  else await prisma.ad.update({ where: { id: params.id }, data: { active: b.active === true } });
  return NextResponse.json({ ok: true });
}
