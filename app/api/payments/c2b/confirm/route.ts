import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { parseDarajaTime } from '@/lib/mpesa';

// Safaricom Daraja C2B confirmation callback.
// Registered as: {SITE_URL}/api/payments/c2b/confirm?key={C2B_CALLBACK_SECRET}
// (Daraja rejects callback URLs that contain words like "mpesa" or "safaricom".)
export async function POST(req: NextRequest) {
  const secret = process.env.C2B_CALLBACK_SECRET;
  if (!secret || req.nextUrl.searchParams.get('key') !== secret) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: 'Rejected' }, { status: 401 });
  }

  const b = await req.json().catch(() => null);
  const transId = String(b?.TransID ?? '').trim().toUpperCase();
  if (!transId) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Missing TransID' }, { status: 400 });

  await prisma.mpesaTransaction.upsert({
    where: { transId },
    update: {},
    create: {
      transId,
      amount: parseFloat(String(b.TransAmount ?? '0')) || 0,
      shortCode: String(b.BusinessShortCode ?? ''),
      transTime: parseDarajaTime(String(b.TransTime ?? '')),
      msisdn: b.MSISDN ? String(b.MSISDN) : null,
      firstName: b.FirstName ? String(b.FirstName) : null,
      raw: b,
    },
  });

  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}
