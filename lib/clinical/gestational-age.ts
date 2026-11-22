/**
 * Clinical Gestational Age (GA) and Estimated Due Date (EDD) Calculator.
 * Based on Naegele's rule (LMP + 280 days / 40 weeks) and WHO ANC models.
 */

export const NORMAL_GESTATION_DAYS = 280;

export interface GestationalAgeResult {
  weeks: number;
  days: number;
  totalDays: number;
  trimester: 1 | 2 | 3;
  formatted: string;
}

export interface PostnatalAgeResult {
  days: number;
  weeks: number;
  isCompleted: boolean;
  formatted: string;
}

/**
 * Calculates EDD from LMP (LMP + 280 days).
 */
export function calculateEddFromLmp(lmp: Date): Date {
  const edd = new Date(lmp);
  edd.setDate(edd.getDate() + NORMAL_GESTATION_DAYS);
  return edd;
}

/**
 * Calculates completed gestational age in weeks and days relative to an asOf date.
 */
export function calculateGestationalAge(
  edd: Date,
  asOf: Date = new Date()
): GestationalAgeResult {
  // Start date of gestation = EDD - 280 days
  const gestationStart = new Date(edd);
  gestationStart.setDate(gestationStart.getDate() - NORMAL_GESTATION_DAYS);

  const diffMs = asOf.getTime() - gestationStart.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (totalDays < 0) {
    return {
      weeks: 0,
      days: 0,
      totalDays: 0,
      trimester: 1,
      formatted: "0 weeks + 0 days",
    };
  }

  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;

  let trimester: 1 | 2 | 3 = 1;
  if (weeks <= 13) {
    trimester = 1;
  } else if (weeks <= 27) {
    trimester = 2;
  } else {
    trimester = 3;
  }

  return {
    weeks,
    days,
    totalDays,
    trimester,
    formatted: `${weeks} weeks + ${days} days`,
  };
}

/**
 * Checks if a pregnancy is overdue (> EDD + 14 days / 42 weeks) without delivery recorded.
 */
export function isOverdue(edd: Date, asOf: Date = new Date()): boolean {
  const diffMs = asOf.getTime() - edd.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 14;
}

/**
 * Calculates postnatal age in completed days and weeks.
 */
export function calculatePostnatalAge(
  deliveryDate: Date,
  asOf: Date = new Date()
): PostnatalAgeResult {
  const diffMs = asOf.getTime() - deliveryDate.getTime();
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const weeks = Math.floor(days / 7);
  const isCompleted = days >= 42; // 6 weeks postpartum

  return {
    days,
    weeks,
    isCompleted,
    formatted: `Day ${days} (${weeks} wks postpartum)`,
  };
}
