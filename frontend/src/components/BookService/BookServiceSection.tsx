import { Link } from 'react-router-dom'
import { services } from '../../data/services'
import { ServiceCard } from './ServiceCard'
import { ChevronRightIcon } from '../icons/Icons'
import './BookServiceSection.css'

export function BookServiceSection() {
  return (
    <section className="book-service" aria-labelledby="book-service-heading">
      <div className="container">
        <div className="book-service__header">
          <h2 id="book-service-heading" className="book-service__heading">
            Our Services
          </h2>
          {/* Services page already exists and lists every service — the
              natural "see everything" destination for this link. */}
          <Link to="/services" className="book-service__view-all">
            View All
            <ChevronRightIcon className="book-service__view-all-icon" />
          </Link>
        </div>
        <div className="book-service__grid">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </section>
  )
}
