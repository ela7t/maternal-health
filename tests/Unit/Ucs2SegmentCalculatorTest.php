<?php

declare(strict_types=1);

namespace App\Tests\Unit;

use App\Service\Sms\Ucs2SegmentCalculator;
use PHPUnit\Framework\TestCase;

class Ucs2SegmentCalculatorTest extends TestCase
{
    private Ucs2SegmentCalculator $calculator;

    protected function setUp(): void
    {
        $this->calculator = new Ucs2SegmentCalculator();
    }

    public function testPlainEnglishGsm7SingleSegment(): void
    {
        $text = 'Hello, your next ANC appointment is scheduled at Wolkite Health Center.';
        $result = $this->calculator->calculate($text);

        $this->assertSame('GSM-7', $result['encoding']);
        $this->assertFalse($result['is_geez_amharic']);
        $this->assertSame(1, $result['segment_count']);
    }

    public function testAmharicGeezSingleSegmentUnder70Chars(): void
    {
        // 53 Amharic Ge'ez characters (<= 70 chars = 1 segment)
        $amharic = 'ጤና ይስጥልኝ! በእርግዝና ወቅት የተመጣጠነ ምግብ መመገብ አስፈላጊ ነው።';
        $result = $this->calculator->calculate($amharic);

        $this->assertSame('UCS-2', $result['encoding']);
        $this->assertTrue($result['is_geez_amharic']);
        $this->assertSame(1, $result['segment_count']);
        $this->assertSame(70, $result['max_chars_in_current_segment']);
    }

    public function testAmharicGeezMultiSegmentOver70Chars(): void
    {
        // Repeating Amharic text to exceed 70 characters (95 characters -> 2 segments)
        $longAmharic = 'ጤና ይስጥልኝ! በእርግዝናዎ ወቅት የተመጣጠነ ምግብና የአይረን ክኒን መውሰድ እርስዎና ፅንሱ ጤናማ እንድትሆኑ ይረዳል። በሰዓቱ ወደ ጤና ጣቢያ ይሂዱ።';
        $result = $this->calculator->calculate($longAmharic);

        $this->assertSame('UCS-2', $result['encoding']);
        $this->assertTrue($result['is_geez_amharic']);
        $this->assertSame(2, $result['segment_count']);
        $this->assertSame(134, $result['max_chars_in_current_segment']); // 67 * 2
    }
}
