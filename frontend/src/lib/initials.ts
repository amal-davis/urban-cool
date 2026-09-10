/** "Amal K S" -> "AS" — first + last initial, for an avatar fallback when
 *  no photo is available. Extracted from ProfileHeader.tsx (the Personal
 *  Dashboard's original avatar) so TechnicianCard (Service Tracking page)
 *  can reuse the exact same fallback logic instead of a second copy —
 *  unlike CSS in this project, small shared JS/TS helpers are meant to be
 *  imported, not duplicated (see lib/validation.ts, lib/indianPhone.ts). */
export function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}
