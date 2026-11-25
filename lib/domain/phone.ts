import crypto from "crypto";
import { DomainError } from "./stateMachines";

/**
 * Normalizes and validates an Ethiopian mobile phone number into E.164 (+2519... or +2517...).
 * Throws DomainError(400) if the number is not a valid 9-digit Ethiopian mobile subscriber number.
 */
export function normalizeEthiopianPhone(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  let normalized = digits;

  if (digits.startsWith("0") && digits.length === 10) {
    normalized = "251" + digits.slice(1);
  } else if (digits.length === 9 && (digits.startsWith("9") || digits.startsWith("7"))) {
    normalized = "251" + digits;
  }

  if (!/^251[79]\d{8}$/.test(normalized)) {
    throw new DomainError(
      "Invalid Ethiopian mobile number. Expected +2519XXXXXXXX, +2517XXXXXXXX, or 09/07XXXXXXXX.",
      400
    );
  }

  return `+${normalized}`;
}

export function hashPhone(e164: string): string {
  return crypto.createHash("sha256").update(e164).digest("hex");
}
