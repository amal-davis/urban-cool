import type { Service } from '../../data/services'
import { ServiceImage } from '../ServiceDetailPage/ServiceImage'
import { IncludedServices } from '../ServiceDetailPage/IncludedServices'
import { EstimatedPrice } from '../ServiceDetailPage/EstimatedPrice'
import '../ServiceDetailPage/ServiceDetailPage.css'
import './BookingPage.css'

interface BookingSummaryProps {
  service: Service
}

/**
 * Right column on desktop (stacks above the form on mobile — see
 * BookingPage.css). Reuses the exact same ServiceImage/IncludedServices/
 * EstimatedPrice components the Service Detail page renders — same data,
 * same visuals, zero duplicated service content — rather than re-rendering
 * service.name/shortDescription/includedServices/startingPrice by hand a
 * second time.
 */
export function BookingSummary({ service }: BookingSummaryProps) {
  return (
    <aside className="booking-summary" aria-labelledby="booking-summary-heading">
      <ServiceImage service={service} />

      <div className="booking-summary__body">
        <h2 id="booking-summary-heading" className="booking-summary__name">
          {service.name}
        </h2>
        <p className="booking-summary__description">{service.shortDescription}</p>

        <IncludedServices items={service.includedServices} />
        <EstimatedPrice
          startingPrice={service.startingPrice}
          endingPrice={service.estimatedPriceTo}
          priceLabel={service.priceLabel}
        />
      </div>
    </aside>
  )
}
