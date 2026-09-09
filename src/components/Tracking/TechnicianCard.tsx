import { PhoneIcon } from '../icons/Icons'
import { formatGroupedIndianMobile, toE164 } from '../../lib/indianPhone'
import { initialsFor } from '../../lib/initials'

interface TechnicianCardProps {
  name: string
  phone: string
}

/**
 * Initials avatar (same pattern as ProfileHeader's own avatar, via
 * lib/initials.ts — there's no technician photo field anywhere in the
 * backend, so this never has a real image to fall back from) + name +
 * Call. No rating/review count is shown — no rating system exists anywhere
 * in this project (see TechnicianProfile/Booking models); showing one here
 * would be fabricated.
 *
 * Call uses a real `tel:` link built from `phone` — never a hardcoded
 * number — with a full accessible name ("Call technician {name}"), not
 * just an icon.
 */
export function TechnicianCard({ name, phone }: TechnicianCardProps) {
  return (
    <div className="technician-card">
      <div className="technician-card__avatar" aria-hidden="true">
        <span className="technician-card__avatar-initials">{initialsFor(name)}</span>
      </div>

      <div className="technician-card__info">
        <span className="technician-card__name">{name}</span>
      </div>

      <a
        href={`tel:${toE164(phone)}`}
        className="technician-card__call icon-button"
        aria-label={`Call technician ${name}, +91 ${formatGroupedIndianMobile(phone)}`}
      >
        <PhoneIcon aria-hidden="true" />
      </a>
    </div>
  )
}
