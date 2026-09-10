import { Link } from 'react-router-dom'
import type { Service } from '../../data/services'
import { ChevronRightIcon } from '../icons/Icons'
import './ServiceCard.css'

interface ServiceCardProps {
  service: Service
}

/**
 * The entire card is one control (not an icon + a separate "Book Now"
 * button) — per the brief, the whole tile is the tap target. The trailing
 * circular arrow is purely decorative (aria-hidden), echoing tappability;
 * it isn't a second nested control.
 *
 * The per-service tint (`service-card--${id}`, see ServiceCard.css) is
 * keyed off `id` rather than a new data field: this card only ever renders
 * the 4 hardcoded entries in data/services.ts (BookServiceSection maps that
 * array directly, never the backend-fetched list from servicesApi.ts), so
 * the id set is fixed and known — no schema change needed for 4 colors.
 */
export function ServiceCard({ service }: ServiceCardProps) {
  const { id, name, ariaLabel, Icon, cardImage, shortDescription } = service

  return (
    <Link to={`/service/${id}`} className={`service-card service-card--${id}`} aria-label={ariaLabel}>
      <span className="service-card__badge">{Icon && <Icon className="service-card__badge-icon" />}</span>

      <span className="service-card__body">
        <span className="service-card__name">{name}</span>
        <span className="service-card__description">{shortDescription}</span>
      </span>

      {/* Real isolated product render (see Service.cardImage's doc comment
          for why this is a separate field from imageUrl) — decorative alt:
          the name/description already say what it shows. Falls back to the
          badge's own icon, enlarged, for any service that doesn't set one
          (only the 4 hardcoded services below ever set cardImage; a
          backend-fetched service falling back here is still coherent). */}
      {cardImage ? (
        <img src={cardImage} alt="" className="service-card__illustration" loading="lazy" />
      ) : (
        Icon && <Icon className="service-card__illustration service-card__illustration--icon" />
      )}

      <span className="service-card__arrow">
        <ChevronRightIcon />
      </span>
    </Link>
  )
}
