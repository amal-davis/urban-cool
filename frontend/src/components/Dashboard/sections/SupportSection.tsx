import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRightIcon, HeadsetIcon, CalendarIcon, ShieldCheckIcon } from '../../icons/Icons'
import { DashboardMenuItem } from '../DashboardMenuItem'
import { supportFaqs } from '../../../data/dashboardData'
import './SupportSection.css'
import './SectionCard.css'

/**
 * Help & Support. All three action rows route to the existing /contact
 * page (see ContactPage.tsx) — there's no dedicated ticket/report backend
 * yet (explicitly out of scope for this frontend-only pass), so each is
 * labeled honestly as reaching the same real contact channel rather than
 * pretending to file a ticket. Reuses DashboardMenuItem for those rows
 * instead of a one-off row style.
 */
export function SupportSection() {
  const navigate = useNavigate()
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

  return (
    <>
      <div className="section-card">
        <h3 className="section-heading">Frequently Asked Questions</h3>
        <ul className="faq-list">
          {supportFaqs.map((faq, index) => {
            const isOpen = openFaqIndex === index
            return (
              <li key={faq.question} className="faq-item">
                <button
                  type="button"
                  className="faq-item__question"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                >
                  {faq.question}
                  <ChevronRightIcon className={`faq-item__chevron${isOpen ? ' is-open' : ''}`} />
                </button>
                {isOpen && <p className="faq-item__answer">{faq.answer}</p>}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="section-card support-options">
        <h3 className="section-heading">More Ways to Get Help</h3>
        <DashboardMenuItem
          Icon={HeadsetIcon}
          label="Contact Support"
          subtitle="Reach the Urban Cool team directly"
          onClick={() => navigate('/contact')}
        />
        <DashboardMenuItem
          Icon={ShieldCheckIcon}
          label="Report an Issue"
          subtitle="Tell us what went wrong with a booking"
          onClick={() => navigate('/contact')}
        />
        <DashboardMenuItem
          Icon={CalendarIcon}
          label="Booking Help"
          subtitle="Get help choosing or scheduling a service"
          onClick={() => navigate('/contact')}
        />
      </div>
    </>
  )
}
