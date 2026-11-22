export * from "./sms/ucs2-segment-counter";

import { calculateSmsSegments as baseCalc } from "./sms/ucs2-segment-counter";

export function calculateSmsSegments(text: string) {
  const res = baseCalc(text);
  return {
    ...res,
    isUnicode: res.encoding === "UCS-2",
    charsRemainingInSegment: res.remainingInSegment,
  };
}
