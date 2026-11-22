<?php

declare(strict_types=1);

namespace App\Service\Sms;

/**
 * Calculates SMS character counts, encoding type (GSM-7 vs UCS-2 for Amharic/Ge'ez),
 * and billing segment boundaries.
 */
class Ucs2SegmentCalculator
{
    // GSM 7-bit basic character set regex
    private const GSM_7_REGEX = '/^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !"#¤%&\'()*+,\-.\/0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà^{}\\[~\\]|€]*$/u';

    /**
     * Calculates encoding, character count, and billable segments.
     *
     * @return array{
     *     encoding: 'GSM-7'|'UCS-2',
     *     char_count: int,
     *     segment_count: int,
     *     max_chars_in_current_segment: int,
     *     remaining_in_segment: int,
     *     is_geez_amharic: bool
     * }
     */
    public function calculate(string $text): array
    {
        $charCount = mb_strlen($text, 'UTF-8');

        // Check if text has any non-GSM7 characters (Amharic Ge'ez script, etc.)
        $isGsm7 = (bool) preg_match(self::GSM_7_REGEX, $text);
        $encoding = $isGsm7 ? 'GSM-7' : 'UCS-2';

        // Check specifically for Ethiopian Ge'ez Unicode block (U+1200 to U+137F, etc.)
        $isGeez = (bool) preg_match('/[\x{1200}-\x{137F}\x{1380}-\x{139F}\x{2D80}-\x{2DDF}]/u', $text);

        if ($encoding === 'GSM-7') {
            if ($charCount <= 160) {
                $segmentCount = $charCount === 0 ? 0 : 1;
                $maxSegmentChars = 160;
                $remaining = 160 - $charCount;
            } else {
                $segmentCount = (int) ceil($charCount / 153);
                $maxSegmentChars = $segmentCount * 153;
                $remaining = $maxSegmentChars - $charCount;
            }
        } else {
            // UCS-2 (Required for Amharic Ge'ez)
            if ($charCount <= 70) {
                $segmentCount = $charCount === 0 ? 0 : 1;
                $maxSegmentChars = 70;
                $remaining = 70 - $charCount;
            } else {
                $segmentCount = (int) ceil($charCount / 67);
                $maxSegmentChars = $segmentCount * 67;
                $remaining = $maxSegmentChars - $charCount;
            }
        }

        return [
            'encoding' => $encoding,
            'char_count' => $charCount,
            'segment_count' => $segmentCount,
            'max_chars_in_current_segment' => $maxSegmentChars,
            'remaining_in_segment' => $remaining,
            'is_geez_amharic' => $isGeez,
        ];
    }
}
