import { NextResponse, type NextRequest } from 'next/server';

// Daraja C2B validation callback (only called if external validation is enabled on your shortcode).
export async function POST(req: NextRequest) {
  const secret = process.env.C2B_CALLBACK_SECRET;
  if (!secret || req.nextUrl.searchParams.get('key') !== secret) {
    return NextResponse.json({ ResultCode: 'C2B00016', ResultDesc: 'Rejected' }, { status: 401 });
  }
  return NextResponse.json({ ResultCode: '0', ResultDesc: 'Accepted' });
}
