import type { User } from '@prisma/client';
import { getSettings } from './settings';

export const SENSITIVE_REVIEW_NOTE = 'Marked sensitive – in review. An admin will publish or unpublish it soon.';

/**
 * Status for new content:
 * - admins publish straight away
 * - anything marked sensitive waits for admin review (publish / unpublish)
 * - otherwise it follows the "publish without review" setting
 */
export async function initialStatus(user: Pick<User, 'role'>, sensitive: boolean) {
  if (user.role === 'ADMIN') return { status: 'APPROVED' as const, moderationNote: null };
  if (sensitive) return { status: 'PENDING' as const, moderationNote: SENSITIVE_REVIEW_NOTE };
  const auto = (await getSettings()).auto_publish === 'true';
  return auto ? { status: 'APPROVED' as const, moderationNote: null } : { status: 'PENDING' as const, moderationNote: 'In review' };
}

/** Friendly status label shown to the creator on their own content. */
export function statusLabel(status: string, flaggedSexual = false) {
  if (status === 'APPROVED') return null;
  if (status === 'PENDING') return 'In review';
  return flaggedSexual ? 'Removed' : 'Unpublished';
}

/** Can this user publish premium (paid) content? Verified creators, admins and admin-run profiles. */
export const canPostPremium = (u: Pick<User, 'verified' | 'role' | 'managedByAdmin'>) =>
  u.verified || u.role === 'ADMIN' || u.managedByAdmin;
