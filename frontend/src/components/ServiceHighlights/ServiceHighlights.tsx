import { highlights } from '../../data/highlights'
import './ServiceHighlights.css'

/**
 * A pure trust-badge strip (icon + title + subtitle x3) — no visible
 * heading, matching the reference design. The section still needs an
 * accessible name of its own though (every landmark should), so one exists
 * as a visually-hidden heading rather than being dropped entirely.
 */
export function ServiceHighlights() {
  return (
    <section className="service-highlights" aria-labelledby="service-highlights-heading">
      <div className="container">
        <h2 id="service-highlights-heading" className="visually-hidden">
          Why Customers Trust Urban Cool
        </h2>

        <ul className="service-highlights__list">
          {highlights.map(({ id, title, subtitle, Icon }) => (
            <li key={id} className="highlight">
              <span className="highlight__icon" aria-hidden="true">
                <Icon />
              </span>
              <span className="highlight__text">
                <span className="highlight__title">{title}</span>
                <span className="highlight__subtitle">{subtitle}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
