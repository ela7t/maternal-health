<?php

declare(strict_types=1);

namespace App\Service\Clinical;

use DateTimeImmutable;
use DateTimeInterface;
use InvalidArgumentException;

/**
 * Calculates Gestational Age (GA), Estimated Due Date (EDD), trimesters,
 * and postnatal duration for maternal health scheduling.
 */
class GestationalAgeCalculator
{
    public const NORMAL_GESTATION_DAYS = 280; // 40 weeks

    /**
     * Calculates EDD from LMP (LMP + 280 days / Naegele's rule).
     */
    public function calculateEddFromLmp(DateTimeInterface $lmp): DateTimeImmutable
    {
        $lmpImmutable = DateTimeImmutable::createFromInterface($lmp);
        return $lmpImmutable->modify('+' . self::NORMAL_GESTATION_DAYS . ' days');
    }

    /**
     * Calculates completed gestational age in weeks and days as of a reference date (defaults to today).
     *
     * @return array{weeks: int, days: int, total_days: int, trimester: int, formatted: string}
     */
    public function calculateGestationalAge(DateTimeInterface $edd, ?DateTimeInterface $asOf = null): array
    {
        $asOfDate = $asOf ? DateTimeImmutable::createFromInterface($asOf) : new DateTimeImmutable('today');
        $eddDate = DateTimeImmutable::createFromInterface($edd);

        // Conception / start date is EDD minus 280 days
        $gestationStart = $eddDate->modify('-' . self::NORMAL_GESTATION_DAYS . ' days');

        $interval = $gestationStart->diff($asOfDate);
        $totalDays = (int) $interval->format('%r%a');

        if ($totalDays < 0) {
            $weeks = 0;
            $days = 0;
        } else {
            $weeks = intdiv($totalDays, 7);
            $days = $totalDays % 7;
        }

        $trimester = match (true) {
            $weeks <= 13 => 1,
            $weeks <= 27 => 2,
            default => 3,
        };

        return [
            'weeks' => $weeks,
            'days' => $days,
            'total_days' => $totalDays,
            'trimester' => $trimester,
            'formatted' => sprintf('%d weeks + %d days', $weeks, $days),
        ];
    }

    /**
     * Checks if pregnancy is overdue (> EDD + 14 days / 42 weeks) without delivery.
     */
    public function isOverdue(DateTimeInterface $edd, ?DateTimeInterface $asOf = null): bool
    {
        $asOfDate = $asOf ? DateTimeImmutable::createFromInterface($asOf) : new DateTimeImmutable('today');
        $eddDate = DateTimeImmutable::createFromInterface($edd);

        $diffDays = (int) $eddDate->diff($asOfDate)->format('%r%a');
        return $diffDays > 14;
    }

    /**
     * Calculates postnatal age in completed days and weeks.
     *
     * @return array{days: int, weeks: int, is_completed: bool, formatted: string}
     */
    public function calculatePostnatalAge(DateTimeInterface $deliveryDate, ?DateTimeInterface $asOf = null): array
    {
        $asOfDate = $asOf ? DateTimeImmutable::createFromInterface($asOf) : new DateTimeImmutable('today');
        $delivered = DateTimeImmutable::createFromInterface($deliveryDate);

        $days = (int) $delivered->diff($asOfDate)->format('%r%a');
        if ($days < 0) {
            $days = 0;
        }

        $weeks = intdiv($days, 7);
        $isCompleted = ($days >= 42); // 6 weeks postpartum

        return [
            'days' => $days,
            'weeks' => $weeks,
            'is_completed' => $isCompleted,
            'formatted' => sprintf('Day %d (%d weeks postpartum)', $days, $weeks),
        ];
    }
}
