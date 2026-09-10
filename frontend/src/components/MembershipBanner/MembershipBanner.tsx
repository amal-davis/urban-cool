import { Link } from 'react-router-dom'
import logo from '../../assets/urban-cool-logo.png'
import { PercentIcon, ShieldCheckIcon, CalendarIcon, ChevronRightIcon } from '../icons/Icons'
import './MembershipBanner.css'

// Content is specific to this one promotional card (not reused elsewhere),
// so it lives inline here rather than in src/data/ — same call FinalCTA
// already makes for its own one-off copy.
const benefits = [
  { id: 'discounts', Icon: PercentIcon, title: 'Exclusive', subtitle: 'Discounts' },
  { id: 'priority', Icon: ShieldCheckIcon, title: 'Priority', subtitle: 'Booking' },
  { id: 'reminders', Icon: CalendarIcon, title: 'Annual', subtitle: 'Reminders' },
]

export function MembershipBanner() {
  return (
    <section className="membership-banner" aria-labelledby="membership-banner-heading">
      <div className="container">
        <div className="membership-banner__card">
          {/* Decorative only — subtle depth, no information carried here. */}
          <div className="membership-banner__shape membership-banner__shape--one" aria-hidden="true" />
          <div className="membership-banner__shape membership-banner__shape--two" aria-hidden="true" />

          <div className="membership-banner__content">
            <div className="membership-banner__intro">
              <p className="membership-banner__eyebrow">Urban Cool</p>
              <h2 id="membership-banner-heading" className="membership-banner__heading">
                Membership
              </h2>
              <p className="membership-banner__tagline">More Care. Long-Term Savings.</p>
            </div>

            <div className="membership-banner__visual">
              {/* Stand-in for a dedicated membership-card asset: no such asset
                  exists in the project yet (checked src/assets), so this
                  reuses the Urban Cool logo inside a card-shaped frame. Swap
                  the `logo` import for a real membership-card image here
                  once one is designed — the frame/tilt/sizing needs no
                  other change. */}
              <div className="membership-banner__card-visual">
                <img src={logo} alt="Urban Cool membership card" className="membership-banner__image" />
              </div>
            </div>

            <div className="membership-banner__details">
              <ul className="membership-banner__benefits">
                {benefits.map(({ id, Icon, title, subtitle }) => (
                  <li key={id} className="membership-benefit">
                    <span className="membership-benefit__icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="membership-benefit__text">
                      <span className="membership-benefit__title">{title}</span>
                      <span className="membership-benefit__subtitle">{subtitle}</span>
                    </span>
                  </li>
                ))}
              </ul>

              {/* No dedicated membership page exists yet — points at Contact,
                  same fallback FinalCTA uses for a CTA with no single-page
                  target of its own. Swap to a real /membership route once
                  one exists. */}
              <Link to="/contact" className="btn membership-banner__cta">
                View Membership
                <ChevronRightIcon className="membership-banner__cta-icon" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
