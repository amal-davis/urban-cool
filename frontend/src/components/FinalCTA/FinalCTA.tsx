import { Link } from 'react-router-dom'
import './FinalCTA.css'

export function FinalCTA() {
  return (
    <section className="final-cta">
      <div className="container final-cta__inner">
        <h2 className="final-cta__heading">Need Appliance Service?</h2>
        <p className="final-cta__description">Book your appliance service with Urban Cool today.</p>

        <div className="final-cta__actions">
          {/* No single service to book from this generic, page-bottom CTA
              (unlike HeroCarousel's own per-slide "Book Now", which already
              knows which service it's for) — Services is where a customer
              actually picks one, same destination ServiceNotFound.tsx's own
              "Browse Services" link uses. */}
          <Link to="/services" className="btn btn--accent">
            Book a Service
          </Link>
          <Link to="/contact" className="btn btn--ghost final-cta__secondary">
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  )
}
