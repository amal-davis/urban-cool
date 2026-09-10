import { MapPinIcon } from '../icons/Icons'
import kochi from '../../assets/photos/kochi.jpg'
import { services } from '../../data/services'
import './ServiceAvailability.css'

export function ServiceAvailability() {
  return (
    <section className="service-availability" aria-labelledby="service-availability-heading">
      <div className="container service-availability__inner">
        <div className="service-availability__content">
          <span className="service-availability__badge">
            <MapPinIcon />
            Service Area
          </span>

          <h2 id="service-availability-heading" className="service-availability__heading">
            Currently Serving <span className="service-availability__highlight">Kochi</span>
          </h2>

          <p className="service-availability__description">
            Urban Cool currently provides appliance repair and service bookings across Kochi.
          </p>

          <div className="service-area-card">
            <span className="service-area-card__label">Service Area</span>
            <span className="service-area-card__value">Kochi, Kerala</span>
            <span className="service-area-card__label service-area-card__label--spaced">
              Available Services
            </span>
            <ul className="service-area-card__list">
              {services.map((service) => (
                <li key={service.id}>{service.name}</li>
              ))}
            </ul>
          </div>

          {/* TODO: wire to the real booking flow once it exists — same "Coming
              soon" pattern as the navbar and hero CTAs. */}
          <button type="button" className="btn btn--accent" title="Coming soon">
            Book a Service
          </button>
        </div>

        <div className="service-availability__visual">
          {/* Provided directly rather than sourced stock photography (see
              heroSlides.ts's `image` field for the same note on the hero's
              product renders) — not tracked in CREDITS.md. A real waterfront
              skyline shot of Kochi itself, not just Kerala generally. */}
          <img
            src={kochi}
            alt="Kochi city skyline along the backwaters"
            className="service-availability__illustration"
          />
        </div>
      </div>
    </section>
  )
}
