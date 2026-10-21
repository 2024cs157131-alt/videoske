// Parses a Lipa na M-PESA Buy Goods confirmation SMS, e.g.
// "TJK4ABC12D Confirmed. Ksh150.00 paid to VIDEOSKE. on 21/10/26 at 5:12 AM.New M-PESA balance is Ksh1,234.00. Transaction cost, Ksh0.00. ..."

export type ParsedMpesa = {
  code: string;
  amount: number;
  tillName: string;
  date: Date; // stored in UTC (SMS times are East Africa Time, UTC+3)
};

export function normalizeName(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function parseMpesaMessage(raw: string): ParsedMpesa | null {
  const text = raw.replace(/\s+/g, ' ').trim();

  const codeMatch = text.match(/\b([A-Z0-9]{10})\b\s*Confirmed/i) ?? text.match(/^([A-Z0-9]{10})\b/i);
  const amountMatch = text.match(/Ksh\.?\s?([\d,]+(?:\.\d{1,2})?)\s+paid\s+to/i);
  const nameMatch = text.match(/paid\s+to\s+(.+?)\.?\s+on\s+\d{1,2}\/\d{1,2}\/\d{2,4}/i);
  const dateMatch = text.match(/on\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+at\s+(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if (!codeMatch || !amountMatch || !nameMatch || !dateMatch) return null;

  const code = codeMatch[1].toUpperCase();
  if (!/[A-Z]/.test(code) || !/\d/.test(code)) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (!isFinite(amount)) return null;

  const [, d, m, y, hh, mm, ap] = dateMatch;
  let year = parseInt(y, 10);
  if (year < 100) year += 2000;
  let hour = parseInt(hh, 10) % 12;
  if (ap.toUpperCase() === 'PM') hour += 12;
  const day = parseInt(d, 10);
  const month = parseInt(m, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day, hour - 3, parseInt(mm, 10)));
  if (isNaN(date.getTime())) return null;

  return { code, amount, tillName: nameMatch[1].trim(), date };
}

/** Daraja TransTime "YYYYMMDDHHmmss" (EAT) -> Date (UTC) */
export function parseDarajaTime(t: string) {
  const m = t.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!m) return new Date();
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 3, +m[5], +m[6]));
}
