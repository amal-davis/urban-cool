import { CalendarIcon, ClockIcon, MapPinIcon, UserIcon } from '../icons/Icons'
import { formatBookingAddress, formatBookingDate, formatEstimatedCost } from '../../lib/bookingApi'
import type { TechnicianJob } from '../../lib/technicianJobsApi'
import { StatusBadge } from '../Dashboard/StatusBadge'
import './JobCard.css'

interface JobCardProps {
  job: TechnicianJob
  onAction: (job: TechnicianJob) => void
}

/** One assigned job — real Booking data (lib/technicianJobsApi.ts), reused
 *  by Today's Jobs (dashboard), My Jobs, Upcoming Jobs, and Job History
 *  alike (each page just filters/sorts the underlying list differently).
 *  Reuses the customer dashboard's own StatusBadge and bookingApi.ts's
 *  formatting helpers directly — a technician's job and a customer's
 *  booking are the same underlying row, so there's no separate status/
 *  formatting vocabulary to keep in sync here.
 *
 * "View Details" opens JobDetailModal (each caller wires `onAction` to
 * that) — the full booking plus, while it isn't finished yet, the one
 * button that advances its status one step forward.
 */
export function JobCard({ job, onAction }: JobCardProps) {
  return (
    <div className="tech-job-card">
      <div className="tech-job-card__top">
        <div className="tech-job-card__heading">
          <span className="tech-job-card__service">{job.serviceName}</span>
          <span className="tech-job-card__ref">Booking ID: {job.bookingRef}</span>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="tech-job-card__meta">
        <span className="tech-job-card__meta-item">
          <UserIcon /> {job.customerName}
        </span>
        <span className="tech-job-card__meta-item">
          <MapPinIcon /> {formatBookingAddress(job)}
        </span>
        <span className="tech-job-card__meta-item">
          <CalendarIcon /> {formatBookingDate(job.bookingDate)}
        </span>
        <span className="tech-job-card__meta-item">
          <ClockIcon /> {job.timeSlotLabel}
        </span>
      </div>

      <div className="tech-job-card__footer">
        <span className="tech-job-card__amount">{formatEstimatedCost(job.estimatedMinPrice, job.estimatedMaxPrice)}</span>
        <button type="button" className="btn btn--ghost" onClick={() => onAction(job)}>
          View Details
        </button>
      </div>
    </div>
  )
}
