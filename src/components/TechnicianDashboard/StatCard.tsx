import type { ComponentType, SVGProps } from 'react'
import { Link } from 'react-router-dom'
import './StatCard.css'

interface StatCardProps {
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  value: string
  label: string
  linkTo?: string
  linkLabel?: string
}

/** One reusable tile — every statistics/earnings/performance figure across
 *  the technician dashboard renders through this, rather than each section
 *  hand-rolling its own card markup (see this project's own "do not
 *  hardcode the design repeatedly" convention, already established by
 *  StatusBadge/BookingCard for the customer side). */
export function StatCard({ Icon, value, label, linkTo, linkLabel }: StatCardProps) {
  return (
    <div className="tech-stat-card">
      <span className="tech-stat-card__icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="tech-stat-card__value">{value}</span>
      <span className="tech-stat-card__label">{label}</span>
      {linkTo && linkLabel && (
        <Link to={linkTo} className="tech-stat-card__link">
          {linkLabel}
        </Link>
      )}
    </div>
  )
}
