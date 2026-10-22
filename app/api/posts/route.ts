import { NextResponse } from 'next/server';
import { notifyNewContent } from '@/lib/notify';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';
import { randomPrice } from '@/lib/settings';
import { canPostPremium, initialStatus } from '@/lib/content';

// Create a post (a thought or story, with an optional photo).
// Everyone can post free posts; verified creators can also post premium (locked) posts.
export async function POST(req: Request) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const user = r.user;
  const b = await readJson(req);

  const body = String(b.body ?? '').trim();
  const isPremium = b.isPremium === true;
  const sensitive = b.sensitive === true;
  const imagePath = b.imagePath ? String(b.imagePath) : null;

  if (body.length < 3 || body.length > 5000) return bad('Write something (3–5,000 characters).');
  if (b.original !== true) return bad('Confirm this post is your own.');
  if (isPremium && !canPostPremium(user)) return bad('Only verified creators can publish premium posts. Get verified first.', 403);
  const folder = isPremium ? 'postimg_private' : 'postimg';
  if (imagePath && !imagePath.startsWith(`${user.id}/${folder}/`)) return bad('Invalid photo.');

  const firstLine = body.split('\n')[0].trim();
  const title = firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;

  const post = await prisma.video.create({
    data: {
      kind: 'POST',
      title,
      body,
      imagePath,
      isPremium,
      price: isPremium ? await randomPrice() : 0,
      sensitive,
      ownerId: user.id,
      ...(await initialStatus(user, sensitive)),
    },
  });
  const notified = post.status === 'APPROVED' ? await notifyNewContent(post.id) : 0;
  return NextResponse.json({ id: post.id, status: post.status, notified });
}
