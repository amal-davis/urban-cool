import type { Service } from '../../data/services'

interface ServiceImageProps {
  service: Service
}

/**
 * The service's visual — dynamic per service via `service.imageUrl`/`Icon`,
 * never hardcoded to one appliance. Prefers a real photo (`imageUrl`) when
 * the data provides one; today none do (static frontend-only data, see
 * services.ts), so every service renders its existing illustration inside
 * the same tinted panel the Services page already uses for this — no new
 * visual language introduced for one page. Swapping in real photography
 * later (e.g. once a backend serves `imageUrl`) needs no change here: the
 * `<img>` branch is already object-fit: contain, rounded, and responsive.
 */
export function ServiceImage({ service }: ServiceImageProps) {
  const { imageUrl, Icon, ariaLabel } = service

  return (
    <div className="service-detail__image-panel">
      {imageUrl ? (
        <img src={imageUrl} alt={`${ariaLabel} image`} className="service-detail__image-photo" />
      ) : (
        // Icon-less fallback only reachable if a hardcoded service (data/
        // services.ts) somehow omitted both — every backend-driven service
        // (see lib/servicesApi.ts) always sets imageUrl instead.
        Icon && <Icon className="service-detail__image-icon" aria-hidden="true" />
      )}
    </div>
  )
}
