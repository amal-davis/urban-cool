import { ChevronRightIcon, MapPinIcon, UserIcon } from '../../icons/Icons'
import { statusGroup } from '../../../lib/bookingApi'
import { nextJobStatus, nextStatusActionLabels } from '../../../lib/technicianJobsApi'
import type { TechnicianJob } from '../../../lib/technicianJobsApi'
import { serviceVisual } from './serviceVisuals'

interface MobileJobCardProps {
  job: TechnicianJob
  /** `full` — today's work: appliance thumbnail, time, customer, address and
   *  an action button. `compact` — tomorrow's work: the same identity in one
   *  tappable row, no action (nothing is actionable until the day arrives). */
  variant: 'full' | 'compact'
  onOpen: (job: TechnicianJob) => void
}

/**
 * One job on the mobile home. Both variants open the same JobDetailModal
 * the desktop JobCard already opens — the card is a way into the job, not a
 * second place where status changes and phone numbers live. (The list
 * payload doesn't carry the customer's phone number at all; it's on the
 * detail, which is another reason the modal stays the single destination.)
 *
 * The action button's label is the real next status step for this job
 * (technicianJobsApi's `nextJobStatus` + `nextStatusActionLabels`, the same
 * vocabulary the modal's own advance button uses) rather than a generic
 * "Start Job" — so a job already under way reads "Mark as Completed", not a
 * button that lies about where the job is.
 *
 * Only the job actually under way gets the filled button. Every card
 * carrying one would put three identical blue blocks down the screen with
 * nothing to say which is next — the emphasis is worth something precisely
 * because at most one job at a time has it.
 */
export function MobileJobCard({ job, variant, onOpen }: MobileJobCardProps) {
  const { Icon, tone } = serviceVisual(job.serviceName)
  const nextStatus = nextJobStatus(job.status)
  const actionLabel = nextStatus ? nextStatusActionLabels[nextStatus] : undefined
  const isUnderway = statusGroup(job.status) === 'in-progress'

  if (variant === 'compact') {
    return (
      <button type="button" className="mtech-job mtech-job--compact" onClick={() => onOpen(job)}>
        <span className={`mtech-job__thumb mtech-job__thumb--tone-${tone}`} aria-hidden="true">
          <Icon />
        </span>

        <span className="mtech-job__compact-body">
          <span className={`mtech-job__service mtech-job__service--tone-${tone}`}>{job.serviceName}</span>
          <span className="mtech-job__line">
            <UserIcon aria-hidden="true" /> {job.customerName}
          </span>
          <span className="mtech-job__line mtech-job__line--muted">
            <MapPinIcon aria-hidden="true" /> {job.addressLine}, {job.city}
          </span>
        </span>

        <ChevronRightIcon className="mtech-job__chevron" aria-hidden="true" />
      </button>
    )
  }

  return (
    <article className="mtech-job">
      <div className="mtech-job__head">
        <span className={`mtech-job__thumb mtech-job__thumb--tone-${tone}`} aria-hidden="true">
          <Icon />
        </span>

        <div className="mtech-job__head-body">
          <div className="mtech-job__head-top">
            <span className={`mtech-job__service mtech-job__service--tone-${tone}`}>{job.serviceName}</span>
            <span className="mtech-job__time">{job.timeSlotLabel}</span>
          </div>

          <p className="mtech-job__line">
            <UserIcon aria-hidden="true" /> {job.customerName}
          </p>
          <p className="mtech-job__line mtech-job__line--muted">
            <MapPinIcon aria-hidden="true" /> {job.addressLine}, {job.city}
          </p>
        </div>
      </div>

      <button
        type="button"
        className={`btn ${isUnderway ? 'btn--primary' : 'btn--ghost'} mtech-job__action`}
        onClick={() => onOpen(job)}
      >
        {actionLabel ?? 'View Details'}
      </button>
    </article>
  )
}
