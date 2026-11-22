<?php

declare(strict_types=1);

namespace App\Service\Calendar;

use DateTimeImmutable;
use DateTimeInterface;
use IntlCalendar;
use InvalidArgumentException;

/**
 * Handles bi-directional conversion between Gregorian and Ethiopian (Ge'ez) calendars.
 * Crucial for maternal and newborn healthcare records in Ethiopian health facilities.
 */
class EthiopianCalendarService
{
    public const MONTH_NAMES = [
        1 => ['am' => 'መስከረም', 'en' => 'Meskerem'],
        2 => ['am' => 'ጥቅምት', 'en' => 'Tikimt'],
        3 => ['am' => 'ኅዳር', 'en' => 'Hidar'],
        4 => ['am' => 'ታኅሣሥ', 'en' => 'Tahsas'],
        5 => ['am' => 'ጥር', 'en' => 'Tir'],
        6 => ['am' => 'የካቲት', 'en' => 'Yakatit'],
        7 => ['am' => 'መጋቢት', 'en' => 'Magabit'],
        8 => ['am' => 'ሚያዝያ', 'en' => 'Miyazya'],
        9 => ['am' => 'ግንቦት', 'en' => 'Ginbot'],
        10 => ['am' => 'ሰኔ', 'en' => 'Sene'],
        11 => ['am' => 'ሐምሌ', 'en' => 'Hamle'],
        12 => ['am' => 'ነሐሴ', 'en' => 'Nehase'],
        13 => ['am' => 'ጳጉሜ', 'en' => 'Pagume'],
    ];

    /**
     * Converts Gregorian DateTime into Ethiopian Date components.
     *
     * @return array{year: int, month: int, day: int, formatted_am: string, formatted_en: string, month_name_am: string, month_name_en: string}
     */
    public function gregorianToEthiopian(DateTimeInterface $date): array
    {
        $tz = \IntlTimeZone::createTimeZone('Africa/Addis_Ababa');
        $cal = IntlCalendar::createInstance($tz, 'en_US@calendar=ethiopic');
        if ($cal !== null) {
            $timestampMs = (float) $date->getTimestamp() * 1000.0;
            $cal->setTime($timestampMs);
            $year = $cal->get(IntlCalendar::FIELD_YEAR);
            $month = $cal->get(IntlCalendar::FIELD_MONTH) + 1; // 0-indexed in ICU
            $day = $cal->get(IntlCalendar::FIELD_DATE);
        } else {
            // Algorithmic fallback using JDN (Julian Day Number)
            [$year, $month, $day] = $this->algoGregorianToEthiopian(
                (int) $date->format('Y'),
                (int) $date->format('n'),
                (int) $date->format('j')
            );
        }

        $monthNameAm = self::MONTH_NAMES[$month]['am'] ?? '';
        $monthNameEn = self::MONTH_NAMES[$month]['en'] ?? '';

        return [
            'year' => $year,
            'month' => $month,
            'day' => $day,
            'formatted_am' => sprintf('%02d/%02d/%d ዓ.ም', $day, $month, $year),
            'formatted_en' => sprintf('%02d/%02d/%d E.C.', $day, $month, $year),
            'month_name_am' => $monthNameAm,
            'month_name_en' => $monthNameEn,
        ];
    }

    /**
     * Converts Ethiopian calendar date (Year, Month 1-13, Day 1-30) into Gregorian DateTimeImmutable.
     */
    public function ethiopianToGregorian(int $year, int $month, int $day): DateTimeImmutable
    {
        if ($month < 1 || $month > 13) {
            throw new InvalidArgumentException("Ethiopian month must be between 1 and 13. Given: $month");
        }

        $isLeap = ($year % 4 === 3);
        $maxDays = ($month === 13) ? ($isLeap ? 6 : 5) : 30;

        if ($day < 1 || $day > $maxDays) {
            throw new InvalidArgumentException("Invalid day $day for month $month in year $year (Max $maxDays days).");
        }

        $tz = \IntlTimeZone::createTimeZone('Africa/Addis_Ababa');
        $cal = IntlCalendar::createInstance($tz, 'en_US@calendar=ethiopic');
        if ($cal !== null) {
            $cal->clear();
            $cal->set(IntlCalendar::FIELD_ERA, 1);
            $cal->set(IntlCalendar::FIELD_YEAR, $year);
            $cal->set(IntlCalendar::FIELD_MONTH, $month - 1);
            $cal->set(IntlCalendar::FIELD_DATE, $day);
            $cal->set(IntlCalendar::FIELD_HOUR_OF_DAY, 0);
            $cal->set(IntlCalendar::FIELD_MINUTE, 0);
            $cal->set(IntlCalendar::FIELD_SECOND, 0);

            $timestampSec = (int) ($cal->getTime() / 1000);
            return (new DateTimeImmutable('@' . $timestampSec))->setTimezone(new \DateTimeZone('Africa/Addis_Ababa'));
        }

        // Algorithmic fallback
        return $this->algoEthiopianToGregorian($year, $month, $day);
    }

    /**
     * Mathematical JDN fallback for Gregorian -> Ethiopian
     */
    private function algoGregorianToEthiopian(int $gy, int $gm, int $gd): array
    {
        $a = intdiv(14 - $gm, 12);
        $y = $gy + 4800 - $a;
        $m = $gm + 12 * $a - 3;
        $jdn = $gd + intdiv(153 * $m + 2, 5) + 365 * $y + intdiv($y, 4) - intdiv($y, 100) + intdiv($y, 400) - 32045;

        $r = ($jdn - 1723856) % 1461;
        $n = ($r % 365) + 365 * intdiv($r, 1460);
        $ey = 4 * intdiv($jdn - 1723856, 1461) + intdiv($r, 365) - intdiv($r, 1460);
        $em = intdiv($n, 30) + 1;
        $ed = ($n % 30) + 1;

        return [$ey, $em, $ed];
    }

    /**
     * Mathematical JDN fallback for Ethiopian -> Gregorian
     */
    private function algoEthiopianToGregorian(int $ey, int $em, int $ed): DateTimeImmutable
    {
        $jdn = (1723856 + 365) + 365 * ($ey - 1) + intdiv($ey, 4) + 30 * ($em - 1) + $ed - 31;
        
        $l = $jdn + 68569;
        $n = intdiv(4 * $l, 146097);
        $l = $l - intdiv(146097 * $n + 3, 4);
        $i = intdiv(4000 * ($l + 1), 1461001);
        $l = $l - intdiv(1461 * $i, 4) + 31;
        $j = intdiv(80 * $l, 2447);
        $d = $l - intdiv(2447 * $j, 80);
        $l = intdiv($j, 11);
        $m = $j + 2 - 12 * $l;
        $y = 100 * ($n - 49) + $i + $l;

        return (new DateTimeImmutable(sprintf('%04d-%02d-%02d', $y, $m, $d), new \DateTimeZone('Africa/Addis_Ababa')));
    }
}
