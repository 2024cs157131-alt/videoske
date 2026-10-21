import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';

const isHttpUrl = (u: string) => {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' || x.protocol === 'http:';
  } catch {
    return false;
  }
};

// Create an ad
export async function POST(req: Request) {
  const r = await requireApiUser(true);
  if ('error' in r) return r.error;
  const b = await readJson(req);

  const type = b.type === 'INTERSTITIAL' ? 'INTERSTITIAL' : 'NATIVE';
  const title = String(b.title ?? '').trim();
  const body = String(b.body ?? '').trim().slice(0, 300) || null;
  const imageUrl = String(b.imageUrl ?? '').trim() || null;
  const linkUrl = String(b.linkUrl ?? '').trim();

  if (title.length < 2 || title.length > 80) return bad('Ad title must be 2–80 characters.');
  if (!isHttpUrl(linkUrl)) return bad('Enter a full link, starting with https://');
  if (imageUrl && !isHttpUrl(imageUrl)) return bad('Image must be a full https:// URL or an uploaded image.');

  const ad = await prisma.ad.create({ data: { type, title, body, imageUrl, linkUrl } });
  return NextResponse.json({ id: ad.id });
}
