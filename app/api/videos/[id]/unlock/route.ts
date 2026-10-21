import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { bad, readJson, requireApiUser } from '@/lib/api';
import { getSettings } from '@/lib/settings';
import { normalizeName, parseMpesaMessage } from '@/lib/mpesa';

const MAX_FAILS_PER_HOUR = 10;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const r = await requireApiUser();
  if ('error' in r) return r.error;
  const user = r.user;

  const b = await readJson(req);
  const message = String(b.message ?? '').trim();
  if (message.length < 30 || message.length > 1000) {
    return bad('Paste the full M-PESA confirmation message you received by SMS.');
  }

  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video || video.status !== 'APPROVED') return bad('Video not found.', 404);

  const already = await prisma.purchase.findUnique({
    where: { userId_videoId: { userId: user.id, videoId: video.id } },
  });
  if (already) return NextResponse.json({ ok: true });

  const recentFails = await prisma.paymentAttempt.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 3600_000) } },
  });
  if (recentFails >= MAX_FAILS_PER_HOUR) return bad('Too many failed attempts. Please try again in an hour.', 429);

  const fail = async (reason: string) => {
    await prisma.paymentAttempt.create({
      data: { userId: user.id, videoId: video.id, rawMessage: message, reason },
    });
    return bad(reason);
  };

  const s = await getSettings();
  const p = parseMpesaMessage(message);

  // 1. Message must be readable: code, amount, till name, date
  if (!p) return fail("We couldn't read that message. Paste the whole SMS from M-PESA exactly as you received it.");

  // 2. Amount must equal this video's price
  if (p.amount !== video.price) {
    return fail(`The message shows Ksh ${p.amount}, but this video costs Ksh ${video.price}.`);
  }

  // 3. Till name must match the one configured by admin
  if (normalizeName(p.tillName) !== normalizeName(s.till_name)) {
    return fail(`This payment went to "${p.tillName}", not ${s.till_name}.`);
  }

  // 4. Date must be recent, not in the future, and after the account was created
  const now = Date.now();
  const maxAgeHours = parseInt(s.payment_max_age_hours, 10) || 24;
  if (p.date.getTime() > now + 10 * 60_000) return fail('The payment date is in the future.');
  if (now - p.date.getTime() > maxAgeHours * 3600_000) {
    return fail(`This payment is older than ${maxAgeHours} hours. Make a new payment and paste that message.`);
  }
  if (p.date.getTime() < user.createdAt.getTime() - 10 * 60_000) {
    return fail('This payment was made before your account was created.');
  }

  // 5. Each M-PESA code can only ever be used once
  if (await prisma.purchase.findUnique({ where: { mpesaCode: p.code } })) {
    return fail('This M-PESA code has already been used.');
  }

  // 6. Optional: the code must also have been reported by Safaricom (Daraja C2B callback)
  if (s.daraja_required === 'true') {
    const tx = await prisma.mpesaTransaction.findUnique({ where: { transId: p.code } });
    if (!tx) return fail('We have not received this payment from M-PESA yet. Wait a minute, then try again.');
    if (tx.amount !== video.price) return fail('The M-PESA record amount does not match this video price.');
  }

  try {
    await prisma.purchase.create({
      data: {
        userId: user.id,
        videoId: video.id,
        amount: video.price,
        mpesaCode: p.code,
        mpesaDate: p.date,
        tillName: p.tillName,
        rawMessage: message,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return fail('This M-PESA code has already been used.');
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
