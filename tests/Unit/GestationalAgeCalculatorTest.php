<?php

declare(strict_types=1);

namespace App\Tests\Unit;

use App\Service\Clinical\GestationalAgeCalculator;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class GestationalAgeCalculatorTest extends TestCase
{
    private GestationalAgeCalculator $calculator;

    protected function setUp(): void
    {
        $this->calculator = new GestationalAgeCalculator();
    }

    public function testEddFromLmp(): void
    {
        $lmp = new DateTimeImmutable('2026-01-01');
        $edd = $this->calculator->calculateEddFromLmp($lmp);

        // LMP + 280 days
        $this->assertSame('2026-10-08', $edd->format('Y-m-d'));
    }

    public function testGestationalAgeWeeksAndTrimester(): void
    {
        // EDD is 70 days from reference date -> 280 - 70 = 210 days -> exactly 30 weeks (Trimester 3)
        $refDate = new DateTimeImmutable('2026-06-01');
        $edd = $refDate->modify('+70 days');

        $ga = $this->calculator->calculateGestationalAge($edd, $refDate);

        $this->assertSame(30, $ga['weeks']);
        $this->assertSame(0, $ga['days']);
        $this->assertSame(3, $ga['trimester']);
        $this->assertSame('30 weeks + 0 days', $ga['formatted']);
    }

    public function testOverduePregnancyDetection(): void
    {
        $asOf = new DateTimeImmutable('2026-06-20');

        // EDD was 10 days ago (not overdue yet, within 14 days)
        $eddRecent = $asOf->modify('-10 days');
        $this->assertFalse($this->calculator->isOverdue($eddRecent, $asOf));

        // EDD was 16 days ago (> 14 days overdue)
        $eddOverdue = $asOf->modify('-16 days');
        $this->assertTrue($this->calculator->isOverdue($eddOverdue, $asOf));
    }

    public function testPostnatalAge(): void
    {
        $delivery = new DateTimeImmutable('2026-05-01');
        $refDate = new DateTimeImmutable('2026-05-15');

        $pnc = $this->calculator->calculatePostnatalAge($delivery, $refDate);

        $this->assertSame(14, $pnc['days']);
        $this->assertSame(2, $pnc['weeks']);
        $this->assertFalse($pnc['is_completed']);

        // At 42 days (6 weeks postpartum)
        $pnc6w = $this->calculator->calculatePostnatalAge($delivery, $delivery->modify('+42 days'));
        $this->assertTrue($pnc6w['is_completed']);
    }
}
