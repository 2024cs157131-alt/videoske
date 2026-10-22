import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';

const AUTO_HIDE_REPORTS = 3;

// Comment moderation. Body { action }:
//   DELETE – the comment's author, the creator of the video/post, or an admin
//   HIDE / SHOW – the creator of the video/post, or an admin (SHOW by an admin also clears reports)
//   REPORT – any other member; hidden automatically after 3 reports until reviewed
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const me = r.user;
  const action = String((await readJson(req)).action ?? '');

  const c = await prisma.comment.findUnique({ where: { id: params.id }, include: { video: { select: { ownerId: true } } } });
  if (!c) return bad('Comment not found (maybe already deleted).', 404);

  const isAdmin = me.role === 'ADMIN';
  const isCreator = c.video.ownerId === me.id;
  const isAuthor = c.userId === me.id;

  switch (action) {
    case 'DELETE':
      if (!isAuthor && !isCreator && !isAdmin) return bad('You can’t delete this comment.', 403);
      await prisma.comment.delete({ where: { id: c.id } });
      return NextResponse.json({ ok: true });

    case 'HIDE':
    case 'SHOW':
      if (!isCreator && !isAdmin) return bad('Only the creator or an admin can do that.', 403);
      if (action === 'SHOW' && isAdmin) {
        await prisma.$transaction([
          prisma.commentReport.deleteMany({ where: { commentId: c.id } }),
          prisma.comment.update({ where: { id: c.id }, data: { hidden: false, reportCount: 0 } }),
        ]);
      } else {
        await prisma.comment.update({ where: { id: c.id }, data: { hidden: action === 'HIDE' } });
      }
      return NextResponse.json({ ok: true });

    case 'REPORT': {
      if (isAuthor) return bad('You can’t report your own comment.');
      try {
        await prisma.commentReport.create({ data: { commentId: c.id, userId: me.id } });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return NextResponse.json({ ok: true });
        throw e;
      }
      const updated = await prisma.comment.update({ where: { id: c.id }, data: { reportCount: { increment: 1 } } });
      if (updated.reportCount >= AUTO_HIDE_REPORTS && !updated.hidden) {
        await prisma.comment.update({ where: { id: c.id }, data: { hidden: true } });
      }
      return NextResponse.json({ ok: true });
    }
    default:
      return bad('Invalid action.');
  }
}
