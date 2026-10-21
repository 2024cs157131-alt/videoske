export const REPORT_CATEGORIES = {
  SEXUAL: 'Sexual content or nudity',
  UNDERAGE: 'Someone looks under 18',
  SENSITIVE: 'Needs a content warning',
  STOLEN: 'Stolen / not theirs',
  OTHER: 'Something else',
} as const;

export type ReportCategory = keyof typeof REPORT_CATEGORIES;
