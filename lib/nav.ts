import { cache } from 'react';
import { prisma } from './db';

/** Unread messages and notifications for the bars – counted once per request. */
export const navCounts = cache(async (userId: string) => {
  const [messages, alerts] = await Promise.all([
    prisma.message.count({ where: { receiverId: userId, readAt: null } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { messages, alerts };
});
