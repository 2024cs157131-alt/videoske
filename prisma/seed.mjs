import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const { ADMIN_USERNAME = 'admin', ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

const defaults = {
  price_min: '150',
  price_max: '200',
  token_price_kes: '1',
  usd_rate: '130',
  token_packages: '100,200,500,1000,2000',
  usd_enabled: 'false',
  commission_percent: '30',
  payout_min_tokens: '1000',
  referral_reward: '50',
  referral_min_purchase: '100',
  verification_fee_kes: '200',
  views_rate: '20',
  auto_publish: 'true',
  auto_hide_reports: '3',
  auto_approve_live: 'false',
  native_ad_every: '8',
  interstitial_minutes: '10',
};

for (const [key, value] of Object.entries(defaults)) {
  await prisma.setting.upsert({ where: { key }, create: { key, value }, update: {} });
}

// Create the first admin only if ADMIN_EMAIL and ADMIN_PASSWORD are set (never overwrites a password)
if (ADMIN_EMAIL && ADMIN_PASSWORD) await prisma.user.upsert({
  where: { email: ADMIN_EMAIL.toLowerCase() },
  update: { role: 'ADMIN' },
  create: {
    username: ADMIN_USERNAME.toLowerCase(),
    email: ADMIN_EMAIL.toLowerCase(),
    passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
    displayName: 'Admin',
    dob: new Date('1990-01-01'),
    consentAt: new Date(),
    role: 'ADMIN',
  },
});

console.log('Seeded settings' + (ADMIN_EMAIL ? ` and admin ${ADMIN_EMAIL}` : ''));
await prisma.$disconnect();
