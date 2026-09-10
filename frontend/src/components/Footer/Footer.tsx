import { NavLink } from 'react-router-dom'
import logo from '../../assets/urban-cool-logo.png'
import { MailIcon, MapPinIcon, PhoneIcon } from '../icons/Icons'
import { businessInfo } from '../../data/businessInfo'
import './Footer.css'

/**
 * Global, rendered once in App.tsx (like Navbar/MobileBottomNav) — not
 * duplicated per page. Hidden below 767px on purpose (see Footer.css) — the
 * mobile bottom nav already covers frequent destinations there, and a full
 * desktop-shaped footer stacked above it reads as clutter, not information.
 */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div className="site-footer__brand">
          {/* alt="" — same reasoning as the navbar: no adjacent repeated
              text, the image itself is the whole brand mark. */}
          <img src={logo} alt="" className="site-footer__logo" />
          <p className="site-footer__tagline">
            Home appliance repair &amp; service booking in {businessInfo.serviceArea}.
          </p>
        </div>

        <nav className="site-footer__column" aria-label="Footer">
          <span className="site-footer__label">Quick Links</span>
          <NavLink to="/" end className="site-footer__link">
            Home
          </NavLink>
          <NavLink to="/services" className="site-footer__link">
            Services
          </NavLink>
          <NavLink to="/contact" className="site-footer__link">
            Contact Us
          </NavLink>
        </nav>

        <div className="site-footer__column">
          <span className="site-footer__label">Get in Touch</span>
          <div className="site-footer__contact-item">
            <MapPinIcon aria-hidden="true" />
            <span>{businessInfo.addressDisplay}</span>
          </div>
          <div className="site-footer__contact-item">
            <PhoneIcon aria-hidden="true" />
            {businessInfo.phoneHref ? (
              <a href={businessInfo.phoneHref}>{businessInfo.phoneDisplay}</a>
            ) : (
              <span>{businessInfo.phoneDisplay}</span>
            )}
          </div>
          <div className="site-footer__contact-item">
            <MailIcon aria-hidden="true" />
            {businessInfo.emailHref ? (
              <a href={businessInfo.emailHref}>{businessInfo.emailDisplay}</a>
            ) : (
              <span>{businessInfo.emailDisplay}</span>
            )}
          </div>
        </div>
      </div>

      <div className="site-footer__bottom">
        <div className="container">
          <p>
            &copy; {new Date().getFullYear()} Urban Cool. Serving {businessInfo.serviceArea}.
          </p>
        </div>
      </div>
    </footer>
  )
}
