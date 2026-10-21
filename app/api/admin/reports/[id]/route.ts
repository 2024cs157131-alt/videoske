import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApiUser } from '@/lib/api';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser(true);
  if ('error' in r) return r.error;
  await prisma.report.update({ where: { id: params.id }, data: { resolved: true } });
  return NextResponse.json({ ok: true });
}
