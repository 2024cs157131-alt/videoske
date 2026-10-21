// Quick check of the M-PESA SMS parser:  npm run test:mpesa
import { parseMpesaMessage, normalizeName } from '../lib/mpesa.ts';

const samples = [
  'TJK4ABC12D Confirmed. Ksh150.00 paid to VIDEOSKE. on 21/10/26 at 5:12 AM.New M-PESA balance is Ksh1,234.00. Transaction cost, Ksh0.00. Amount you can transact within the day is 499,850.00.',
  'SKL9XY77QP Confirmed. Ksh 200.00 paid to VIDEOSKE. on 1/9/2026 at 11:45 PM. New M-PESA balance is Ksh50.00.',
  'Hello this is not an mpesa message',
];

for (const s of samples) {
  const p = parseMpesaMessage(s);
  console.log(p ? { ...p, date: p.date.toISOString(), nameOk: normalizeName(p.tillName) === 'VIDEOSKE' } : null);
}
