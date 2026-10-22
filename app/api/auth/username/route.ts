import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeUsername, usernameProblem } from '@/lib/usernames';

// GET /api/auth/username?u=jane → { available: boolean, message }
export async function GET(req: NextRequest) {
  const u = normalizeUsername(req.nextUrl.searchParams.get('u'));
  const problem = usernameProblem(u);
  if (problem) return NextResponse.json({ available: false, message: problem });
  const taken = await prisma.user.findUnique({ where: { username: u }, select: { id: true } });
  return NextResponse.json({ available: !taken, message: taken ? `@${u} is already taken.` : `@${u} is available ✓` });
}
