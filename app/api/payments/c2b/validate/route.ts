import { NextResponse } from 'next/server';

// Old M-PESA SMS payment callback – replaced by Paystack (/api/paystack/webhook).
export async function POST() {
  return NextResponse.json({ ResultCode: 'C2B00016', ResultDesc: 'No longer in use' }, { status: 410 });
}
