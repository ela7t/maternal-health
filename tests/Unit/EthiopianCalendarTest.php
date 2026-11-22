<?php

declare(strict_types=1);

namespace App\Tests\Unit;

use App\Service\Calendar\EthiopianCalendarService;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class EthiopianCalendarTest extends TestCase
{
    private EthiopianCalendarService $calendar;

    protected function setUp(): void
    {
        $this->calendar = new EthiopianCalendarService();
    }

    public function testGregorianToEthiopianConversion(): void
    {
        // 2026-09-11 is Ethiopian New Year Meskerem 1, 2019 E.C.
        $date = new DateTimeImmutable('2026-09-11');
        $eth = $this->calendar->gregorianToEthiopian($date);

        $this->assertSame(2019, $eth['year']);
        $this->assertSame(1, $eth['month']);
        $this->assertSame(1, $eth['day']);
        $this->assertSame('መስከረም', $eth['month_name_am']);
    }

    public function testEthiopianToGregorianConversion(): void
    {
        // Meskerem 1, 2019 E.C. -> 2026-09-11 GC
        $gregorian = $this->calendar->ethiopianToGregorian(2019, 1, 1);
        $this->assertSame('2026-09-11', $gregorian->format('Y-m-d'));
    }

    public function testPagumeDays(): void
    {
        // Pagume 5 is valid for all years
        $greg = $this->calendar->ethiopianToGregorian(2018, 13, 5);
        $this->assertInstanceOf(DateTimeImmutable::class, $greg);

        // In a leap year (2019 % 4 === 3), Pagume has 6 days
        $leapGreg = $this->calendar->ethiopianToGregorian(2019, 13, 6);
        $this->assertInstanceOf(DateTimeImmutable::class, $leapGreg);
    }
}
