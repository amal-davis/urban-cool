import { highlights } from '../../data/highlights'

/**
 * "Verified Technicians" trust row, between the description and the price/
 * CTA — per the supplied reference design. Reuses the exact same badge
 * (icon, title, subtitle) the homepage's ServiceHighlights strip already
 * shows (data/highlights.ts) rather than inventing new copy for the same
 * claim on this page — one source of truth for what "verified technician"
 * means across the site.
 */
export function TechnicianTrust() {
  const badge = highlights.find((item) => item.id === 'verified-technicians')
  if (!badge) return null

  const { Icon, title, subtitle } = badge

  return (
    <div className="service-detail__technician">
      <span className="service-detail__technician-icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="service-detail__technician-text">
        <span className="service-detail__technician-title">{title}</span>
        <span className="service-detail__technician-subtitle">{subtitle}</span>
      </span>
    </div>
  )
}
