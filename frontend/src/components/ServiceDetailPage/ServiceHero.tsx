import type { Service } from '../../data/services'

interface ServiceHeroProps {
  service: Service
}

/**
 * The page's hero: a rounded photo card with the service name/tagline
 * overlaid directly on the image (dark gradient scrim underneath for
 * contrast), per the supplied mobile reference. This is where the page's
 * one true `<h1>` lives (`#service-detail-heading`, referenced by
 * ServiceDetailPage's `aria-labelledby`) — the content column below never
 * repeats the name as its own heading, so a screen reader hears it once.
 *
 * `imageUrl` is decorative here (`alt=""`) — the name/tagline sitting right
 * on top of it already say what it shows, same reasoning ServiceCard's
 * `cardImage` already documents. Icon-less/photo-less fallback (only
 * reachable if a hardcoded service in data/services.ts omitted both — every
 * backend-driven service from lib/servicesApi.ts always sets imageUrl)
 * switches the copy to a light panel with dark ink text instead of trying
 * to scrim a photo that isn't there.
 */
export function ServiceHero({ service }: ServiceHeroProps) {
  const { imageUrl, Icon, name, shortDescription } = service
  const hasPhoto = Boolean(imageUrl)

  return (
    <div className={`service-detail__hero${hasPhoto ? '' : ' service-detail__hero--icon'}`}>
      {hasPhoto ? (
        <img src={imageUrl} alt="" className="service-detail__hero-photo" />
      ) : (
        Icon && <Icon className="service-detail__hero-icon" aria-hidden="true" />
      )}
      {hasPhoto && <span className="service-detail__hero-scrim" aria-hidden="true" />}

      <div className="service-detail__hero-copy">
        <span className="service-detail__hero-eyebrow">Quick &amp; Reliable Service</span>
        <h1 id="service-detail-heading" className="service-detail__hero-name">
          {name}
        </h1>
        <p className="service-detail__hero-subtitle">{shortDescription}</p>
      </div>
    </div>
  )
}
