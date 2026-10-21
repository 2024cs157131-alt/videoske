import { NextResponse } from 'next/server';
import type { User } from '@prisma/client';
import { getCurrentUser } from './auth';
import { prisma } from './db';

export function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function requireApiUser(admin = false): Promise<{ user: User } | { error: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) return { error: bad('Please log in first.', 401) };
  if (admin && user.role !== 'ADMIN') return { error: bad('Admins only.', 403) };
  return { user };
}

/** Admins may act for another profile (e.g. profiles they created). Everyone else acts for themselves. */
export async function resolveOwner(user: User, ownerId?: unknown): Promise<{ ownerId: string } | { error: NextResponse }> {
  if (!ownerId || ownerId === user.id) return { ownerId: user.id };
  if (user.role !== 'ADMIN') return { error: bad('You can only upload to your own profile.', 403) };
  const owner = await prisma.user.findUnique({ where: { id: String(ownerId) } });
  if (!owner) return { error: bad('Profile not found.', 404) };
  return { ownerId: owner.id };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === 'object' ? b : {};
  } catch {
    return {};
  }
}
