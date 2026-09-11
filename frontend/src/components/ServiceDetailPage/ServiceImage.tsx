import type { Service } from '../../data/services'
import './ServiceImage.css'

interface ServiceImageProps {
  service: Service
}

/**
 * Plain photo/illustration panel — no overlaid copy. Used by BookingSummary
 * (Booking/BookingSummary.tsx), which renders its own heading/description
 * underneath, unlike the /service/:id page itself: that page's hero
 * (ServiceHero.tsx) overlays the name/tagline directly on the image and
 * carries the page's one `<h1>`, which would double up awkwardly next to
 * BookingSummary's own `<h2>` if reused here — hence this smaller sibling
 * component instead of one component serving both call sites.
 */
export function ServiceImage({ service }: ServiceImageProps) {
  const { imageUrl, Icon, ariaLabel } = service

  return (
    <div className="service-media">
      {imageUrl ? (
        <img src={imageUrl} alt={`${ariaLabel} image`} className="service-media__photo" />
      ) : (
        // Icon-less fallback only reachable if a hardcoded service (data/
        // services.ts) somehow omitted both — every backend-driven service
        // (see lib/servicesApi.ts) always sets imageUrl instead.
        Icon && <Icon className="service-media__icon" aria-hidden="true" />
      )}
    </div>
  )
}
