export interface SalaryRange {
  min: number;
  max: number;
  currency: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  "€": "EUR",
  "$": "USD",
  "£": "GBP",
  "A$": "AUD",
  "C$": "CAD",
};

export function parseSalary(raw: string): SalaryRange {
  let currency = "USD";

  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (raw.includes(symbol)) {
      currency = code;
      break;
    }
  }

  // Normalise: remove currency symbols, spaces, commas
  const cleaned = raw.replace(/[€$£A-Z,\s]/gi, "").replace(/k/gi, "000");

  const parts = cleaned.split(/[-–]/);
  const nums = parts.map((p) => parseInt(p, 10)).filter((n) => !isNaN(n));

  if (nums.length === 0) return { min: 0, max: 0, currency };
  if (nums.length === 1) return { min: nums[0], max: nums[0], currency };
  return { min: Math.min(...nums), max: Math.max(...nums), currency };
}

export function formatSalary(range: SalaryRange): string {
  const sym = Object.entries(CURRENCY_SYMBOLS).find(([, code]) => code === range.currency)?.[0] ?? "$";
  if (range.min === range.max) return `${sym}${range.min.toLocaleString()}`;
  return `${sym}${range.min.toLocaleString()} – ${sym}${range.max.toLocaleString()}`;
}
