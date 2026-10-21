import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Count a click, then send the visitor to the advertiser's link
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ad = await prisma.ad.findUnique({ where: { id: params.id } });
  if (!ad) return NextResponse.redirect(new URL('/', req.url));
  await prisma.ad.update({ where: { id: ad.id }, data: { clicks: { increment: 1 } } });
  return NextResponse.redirect(ad.linkUrl);
}
