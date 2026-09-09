import { Link } from 'react-router-dom'
import type { Service } from '../../data/services'
import './ServiceCard.css'

interface ServiceCardProps {
  service: Service
}

/**
 * The entire card is one control (not an icon + a separate "Book Now"
 * button) — per the brief, the whole tile is the tap target.
 *
 * Now a real `<Link>` to that service's /service/:id detail page — this
 * used to be an inert `<button title="Coming soon">` (no service route
 * existed yet); the comment on the old version said to swap it for a real
 * link "once routing exists", which it now does.
 */
export function ServiceCard({ service }: ServiceCardProps) {
  const { id, name, ariaLabel, Icon } = service

  return (
    <Link to={`/service/${id}`} className="service-card" aria-label={ariaLabel}>
      <span className="service-card__image-wrap">
        {/* This tile is always fed one of the hardcoded services below
            (see BookServiceSection.tsx), which always set Icon — guarded
            only because Service.Icon is optional (backend-driven services,
            which never reach this component, don't set it). */}
        {Icon && <Icon className="service-card__image" />}
      </span>
      <span className="service-card__name">{name}</span>
    </Link>
  )
}
