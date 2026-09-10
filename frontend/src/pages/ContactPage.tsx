import { ContactForm } from '../components/Contact/ContactForm'
import { ContactInfo } from '../components/Contact/ContactInfo'
import { MapEmbed } from '../components/Contact/MapEmbed'
import { HeadsetIcon } from '../components/icons/Icons'
import { PageHeader } from '../components/PageHeader/PageHeader'
import { Reveal } from '../components/Reveal/Reveal'
import { usePageMeta } from '../lib/usePageMeta'
import './ContactPage.css'

export function ContactPage() {
  usePageMeta(
    'Contact Us | Urban Cool',
    'Contact Urban Cool for appliance repair and service bookings in Kochi.',
  )

  return (
    <>
      {/* Not wrapped in Reveal: above the fold on every load, same
          reasoning as HomePage's hero. */}
      <PageHeader
        icon={HeadsetIcon}
        heading="Contact Us"
        description="Have a question or need appliance service? Get in touch with Urban Cool."
      />

      <Reveal>
        <section className="contact-main" aria-labelledby="contact-main-heading">
          <div className="container contact-main__grid">
            <div className="contact-main__info">
              <h2 id="contact-main-heading" className="visually-hidden">
                Contact information and message form
              </h2>
              <ContactInfo />
            </div>
            <div className="contact-main__form-card">
              <h3 className="contact-main__form-heading">Send us a message</h3>
              <ContactForm />
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="contact-map" aria-labelledby="contact-map-heading">
          <div className="container">
            <h2 id="contact-map-heading" className="contact-map__heading">
              Find Us
            </h2>
            <div className="contact-map__card">
              <MapEmbed />
            </div>
          </div>
        </section>
      </Reveal>
    </>
  )
}
