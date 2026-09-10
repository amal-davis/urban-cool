import { MailIcon, MapPinIcon, PhoneIcon } from '../icons/Icons'
import { businessInfo } from '../../data/businessInfo'
import { services } from '../../data/services'
import './ContactInfo.css'

export function ContactInfo() {
  const { addressDisplay, phoneDisplay, phoneHref, emailDisplay, emailHref, serviceArea } = businessInfo

  return (
    <div className="contact-info">
      <ul className="contact-info__list">
        <li className="contact-info__item">
          <span className="contact-info__icon" aria-hidden="true">
            <MapPinIcon />
          </span>
          <span className="contact-info__text">
            <span className="contact-info__label">Address</span>
            <span className="contact-info__value">{addressDisplay}</span>
          </span>
        </li>

        <li className="contact-info__item">
          <span className="contact-info__icon" aria-hidden="true">
            <PhoneIcon />
          </span>
          <span className="contact-info__text">
            <span className="contact-info__label">Phone</span>
            {phoneHref ? (
              <a className="contact-info__value contact-info__value--link" href={phoneHref}>
                {phoneDisplay}
              </a>
            ) : (
              <span className="contact-info__value">{phoneDisplay}</span>
            )}
          </span>
        </li>

        <li className="contact-info__item">
          <span className="contact-info__icon" aria-hidden="true">
            <MailIcon />
          </span>
          <span className="contact-info__text">
            <span className="contact-info__label">Email</span>
            {emailHref ? (
              <a className="contact-info__value contact-info__value--link" href={emailHref}>
                {emailDisplay}
              </a>
            ) : (
              <span className="contact-info__value">{emailDisplay}</span>
            )}
          </span>
        </li>
      </ul>

      <div className="contact-service-area">
        <span className="contact-service-area__label">Service Area</span>
        <span className="contact-service-area__value">{serviceArea}</span>
        <p className="contact-service-area__description">
          Urban Cool currently provides appliance service bookings in {serviceArea}.
        </p>
        <span className="contact-service-area__label contact-service-area__label--spaced">
          Available Services
        </span>
        <ul className="contact-service-area__services">
          {services.map((service) => (
            <li key={service.id}>{service.name}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
