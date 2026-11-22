/**
 * Bi-directional conversion between Gregorian and Ethiopian (Ge'ez) Calendars.
 * Crucial for maternal and newborn clinical records in Ethiopian health centers.
 */

export interface EthiopianDate {
  year: number;
  month: number;
  day: number;
  formattedAm: string;
  formattedEn: string;
  monthNameAm: string;
  monthNameEn: string;
}

export const ETHIOPIAN_MONTHS: Record<number, { am: string; en: string }> = {
  1: { am: "መስከረም", en: "Meskerem" },
  2: { am: "ጥቅምት", en: "Tikimt" },
  3: { am: "ኅዳር", en: "Hidar" },
  4: { am: "ታኅሣሥ", en: "Tahsas" },
  5: { am: "ጥር", en: "Tir" },
  6: { am: "የካቲት", en: "Yakatit" },
  7: { am: "መጋቢት", en: "Magabit" },
  8: { am: "ሚያዝያ", en: "Miyazya" },
  9: { am: "ግንቦት", en: "Ginbot" },
  10: { am: "ሰኔ", en: "Sene" },
  11: { am: "ሐምሌ", en: "Hamle" },
  12: { am: "ነሐሴ", en: "Nehase" },
  13: { am: "ጳጉሜ", en: "Pagume" },
};

/**
 * Converts a Gregorian Date into Ethiopian Calendar components.
 */
export function gregorianToEthiopian(date: Date): EthiopianDate {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();

  const a = Math.floor((14 - gm) / 12);
  const y = gy + 4800 - a;
  const m = gm + 12 * a - 3;
  const jdn =
    gd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  const r = (jdn - 1723856) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const ey = 4 * Math.floor((jdn - 1723856) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const em = Math.floor(n / 30) + 1;
  const ed = (n % 30) + 1;

  const monthInfo = ETHIOPIAN_MONTHS[em] || { am: "", en: "" };

  return {
    year: ey,
    month: em,
    day: ed,
    formattedAm: `${String(ed).padStart(2, "0")}/${String(em).padStart(2, "0")}/${ey} ዓ.ም`,
    formattedEn: `${String(ed).padStart(2, "0")}/${String(em).padStart(2, "0")}/${ey} E.C.`,
    monthNameAm: monthInfo.am,
    monthNameEn: monthInfo.en,
  };
}

/**
 * Converts Ethiopian Calendar date (Year, Month 1-13, Day 1-30) into Gregorian Date.
 */
export function ethiopianToGregorian(ey: number, em: number, ed: number): Date {
  if (em < 1 || em > 13) {
    throw new Error(`Ethiopian month must be between 1 and 13. Given: ${em}`);
  }

  const isLeap = ey % 4 === 3;
  const maxDays = em === 13 ? (isLeap ? 6 : 5) : 30;

  if (ed < 1 || ed > maxDays) {
    throw new Error(`Invalid day ${ed} for month ${em} in year ${ey} (Max ${maxDays} days).`);
  }

  const jdn =
    1723856 + 365 + 365 * (ey - 1) + Math.floor(ey / 4) + 30 * (em - 1) + ed - 31;

  const l = jdn + 68569;
  const n = Math.floor((4 * l) / 146097);
  const l2 = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l2 + 1)) / 1461001);
  const l3 = l2 - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l3) / 2447);
  const d = l3 - Math.floor((2447 * j) / 80);
  const l4 = Math.floor(j / 11);
  const m = j + 2 - 12 * l4;
  const y = 100 * (n - 49) + i + l4;

  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Formats Ethiopian year, month, day into standard clinical display string.
 */
export function formatEthiopianDate(ey: number, em: number, ed: number): string {
  const monthInfo = ETHIOPIAN_MONTHS[em] || { am: "", en: "" };
  return `${monthInfo.am || `ወር ${em}`} ${ed}, ${ey} ዓ.ም.`;
}

