/**
 * Indian mobile number rules shared by every auth component. The backend
 * (backend/accounts/serializers.py) enforces the same pattern independently
 * — this is a UX convenience, never the actual security boundary.
 */
export const INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/

export function isValidIndianMobile(value: string): boolean {
  return INDIAN_MOBILE_PATTERN.test(value)
}

/** Strips everything but digits and caps at 10, so the stored value can
 *  never exceed a real Indian mobile number's length no matter what gets
 *  typed or pasted into the field. */
export function sanitizeMobileInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10)
}

/** "9876543210" -> "+919876543210" — the E.164-ish format the backend
 *  expects (see accounts/serializers.py's extract_local_number). */
export function toE164(localNumber: string): string {
  return `+91${localNumber}`
}

/** "+919876543210" -> "9876543210" — the inverse of toE164, for display
 *  helpers (formatGroupedIndianMobile) that expect the bare local number.
 *  Used wherever a Customer's stored mobile_number (always the +91 form —
 *  see accounts/models.py) needs to be shown or re-submitted as a plain
 *  10-digit field. */
export function fromE164(value: string): string {
  return value.replace(/^\+91/, '')
}

/** "9876543210" -> "98765 43210" — readable grouping for display only. */
export function formatGroupedIndianMobile(localNumber: string): string {
  return `${localNumber.slice(0, 5)} ${localNumber.slice(5)}`
}

/** 125 -> "02:05" */
export function formatTimer(totalSeconds: number): string {
  const clamped = Math.max(totalSeconds, 0)
  const minutes = Math.floor(clamped / 60)
  const seconds = clamped % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
