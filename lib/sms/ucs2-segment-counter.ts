/**
 * SMS Segment & Character Calculator.
 * Handles UCS-2 Ge'ez (Amharic) encoding (70 chars per segment) vs. GSM-7 (160 chars).
 */

export interface SegmentCalculation {
  encoding: "GSM-7" | "UCS-2";
  charCount: number;
  segmentCount: number;
  maxCharsInCurrentSegment: number;
  remainingInSegment: number;
  isGeezAmharic: boolean;
}

const GEEZ_REGEX = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF]/;

export function calculateSmsSegments(text: string): SegmentCalculation {
  const charCount = Array.from(text).length; // Proper Unicode grapheme length
  const isGeez = GEEZ_REGEX.test(text);

  // If contains Ge'ez or non-ASCII characters, telecom gateways use UCS-2
  const encoding = isGeez || /[^\x20-\x7E\r\n]/.test(text) ? "UCS-2" : "GSM-7";

  let segmentCount = 0;
  let maxCharsInCurrentSegment = 0;
  let remainingInSegment = 0;

  if (encoding === "GSM-7") {
    if (charCount <= 160) {
      segmentCount = charCount === 0 ? 0 : 1;
      maxCharsInCurrentSegment = 160;
      remainingInSegment = 160 - charCount;
    } else {
      segmentCount = Math.ceil(charCount / 153);
      maxCharsInCurrentSegment = segmentCount * 153;
      remainingInSegment = maxCharsInCurrentSegment - charCount;
    }
  } else {
    // UCS-2 (Required for Amharic / Ge'ez)
    if (charCount <= 70) {
      segmentCount = charCount === 0 ? 0 : 1;
      maxCharsInCurrentSegment = 70;
      remainingInSegment = 70 - charCount;
    } else {
      segmentCount = Math.ceil(charCount / 67);
      maxCharsInCurrentSegment = segmentCount * 67;
      remainingInSegment = maxCharsInCurrentSegment - charCount;
    }
  }

  return {
    encoding,
    charCount,
    segmentCount,
    maxCharsInCurrentSegment,
    remainingInSegment,
    isGeezAmharic: isGeez,
  };
}
