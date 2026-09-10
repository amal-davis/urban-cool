import { Link } from 'react-router-dom'
import { StarIcon } from '../icons/Icons'
import { services } from '../../data/services'

interface CompletedSummaryProps {
  serviceName: string
}

/** COMPLETED-status actions — View Service Details (a real link to that
 *  service's own /service/:id page — the fuller service description/
 *  included-services list lives there, not duplicated on this booking-
 *  specific page) and Rate Technician. No rating flow exists yet anywhere
 *  in this project, so Rate Technician follows the site's established
 *  "Coming soon" placeholder convention (see ServiceCard/FinalCTA/
 *  BookingCTA before this task) rather than a fake submission. */
export function CompletedSummary({ serviceName }: CompletedSummaryProps) {
  // The tracking endpoint only returns the service's display name (see
  // BookingSummaryCard's own comment on why matching against it is safe) —
  // resolved back to its slug here purely to build the /service/:id link.
  const service = services.find((item) => item.name === serviceName)

  return (
    <div className="completed-summary">
      {service && (
        <Link to={`/service/${service.id}`} className="btn btn--ghost">
          View Service Details
        </Link>
      )}
      <button type="button" className="btn btn--primary" title="Coming soon">
        <StarIcon aria-hidden="true" /> Rate Technician
      </button>
    </div>
  )
}
