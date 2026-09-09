import { useEffect, useState } from 'react'
import { Modal } from '../Modal/Modal'
import { StatusBadge } from '../Dashboard/StatusBadge'
import { formatBookingAddress, formatBookingDate, formatEstimatedCost } from '../../lib/bookingApi'
import {
  TechnicianJobsApiError,
  getTechnicianJobDetail,
  nextJobStatus,
  nextStatusActionLabels,
  updateTechnicianJobStatus,
} from '../../lib/technicianJobsApi'
import type { TechnicianJob, TechnicianJobDetail } from '../../lib/technicianJobsApi'
import { formatAmount } from '../../data/technicianDashboardData'
import './JobDetailModal.css'

interface JobDetailModalProps {
  /** The job to show, or null to keep the modal closed — presence controls
   *  visibility here (there's no separate `open` flag) so a fresh job
   *  always means a fresh mount of the body below, via its `key`. */
  job: TechnicianJob | null
  onClose: () => void
  /** Called with the fresh job after a successful status update, so
   *  whichever page opened this (Dashboard/My Jobs/Upcoming Jobs/Job
   *  History) can patch its own already-fetched list in place instead of
   *  refetching everything. */
  onStatusUpdated: (updated: TechnicianJob) => void
}

/** "View Details" on a job card opens this — the full booking behind the
 *  card (customer phone, complaint photos, status timeline) plus, while the
 *  job isn't finished yet, a single button to advance it to whatever the
 *  next status actually is (lib/technicianJobsApi.ts's nextJobStatus/
 *  nextStatusActionLabels). One step at a time, same rule the backend
 *  itself enforces (TechnicianJobStatusUpdateSerializer) — this never
 *  offers a jump or a backward move because there's nothing to click for
 *  one.
 */
export function JobDetailModal({ job, onClose, onStatusUpdated }: JobDetailModalProps) {
  return (
    <Modal open={job !== null} onClose={onClose} title={job ? job.serviceName : 'Job Details'}>
      {job && <JobDetailModalBody key={job.id} job={job} onStatusUpdated={onStatusUpdated} />}
    </Modal>
  )
}

interface BodyProps {
  job: TechnicianJob
  onStatusUpdated: (updated: TechnicianJob) => void
}

function JobDetailModalBody({ job, onStatusUpdated }: BodyProps) {
  const [detail, setDetail] = useState<TechnicianJobDetail | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [updating, setUpdating] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getTechnicianJobDetail(job.id)
      .then((data) => {
        if (cancelled) return
        setDetail(data)
        setLoadState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [job.id])

  async function handleAdvanceStatus() {
    if (!detail || updating) return
    const target = nextJobStatus(detail.status)
    if (!target) return

    setUpdating(true)
    setActionError(null)
    try {
      const updated = await updateTechnicianJobStatus(job.id, target)
      setDetail({ ...detail, status: updated.status, statusLabel: updated.statusLabel })
      onStatusUpdated(updated)
    } catch (error) {
      setActionError(
        error instanceof TechnicianJobsApiError ? error.message : 'Could not update the status. Please try again.',
      )
    } finally {
      setUpdating(false)
    }
  }

  if (loadState === 'loading') {
    return <p className="tech-job-detail__note">Loading job details…</p>
  }
  if (loadState === 'error' || !detail) {
    return <p className="tech-job-detail__note">Couldn’t load this job. Please try again.</p>
  }

  const upcomingStatus = nextJobStatus(detail.status)

  return (
    <div className="tech-job-detail">
      <div className="tech-job-detail__top">
        <span className="tech-job-detail__ref">Booking ID: {detail.bookingRef}</span>
        <StatusBadge status={detail.status} />
      </div>

      <dl className="tech-job-detail__grid">
        <div className="tech-job-detail__field">
          <dt>Customer</dt>
          <dd>{detail.customerName}</dd>
        </div>
        <div className="tech-job-detail__field">
          <dt>Phone</dt>
          <dd>
            <a href={`tel:${detail.customerPhone}`}>{detail.customerPhone}</a>
          </dd>
        </div>
        <div className="tech-job-detail__field">
          <dt>Scheduled</dt>
          <dd>{formatBookingDate(detail.bookingDate)}</dd>
        </div>
        <div className="tech-job-detail__field">
          <dt>Time Slot</dt>
          <dd>{detail.timeSlotLabel}</dd>
        </div>
        <div className="tech-job-detail__field">
          <dt>Estimated Cost</dt>
          <dd>{formatEstimatedCost(detail.estimatedMinPrice, detail.estimatedMaxPrice)}</dd>
        </div>
        {detail.commissionAmount !== null && (
          <div className="tech-job-detail__field">
            <dt>Commission</dt>
            <dd>
              {formatAmount(detail.commissionAmount)}{' '}
              <span className={`tech-job-detail__commission-status${detail.commissionPaid ? ' is-paid' : ''}`}>
                {detail.commissionPaid ? 'Paid' : 'Pending'}
              </span>
            </dd>
          </div>
        )}
        <div className="tech-job-detail__field tech-job-detail__field--full">
          <dt>Address</dt>
          <dd>{formatBookingAddress(detail)}</dd>
        </div>
        <div className="tech-job-detail__field tech-job-detail__field--full">
          <dt>Complaint</dt>
          <dd>{detail.complaint}</dd>
        </div>
      </dl>

      {detail.images.length > 0 && (
        <div className="tech-job-detail__photos">
          {detail.images.map((image) => (
            <img key={image.id} src={image.imageUrl} alt="Photo the customer attached to their complaint" />
          ))}
        </div>
      )}

      {detail.trackingHistory.length > 0 && (
        <ul className="tech-job-detail__timeline">
          {detail.trackingHistory.map((event, index) => (
            <li key={index}>
              <span className="tech-job-detail__timeline-status">{event.statusLabel}</span>
              <span className="tech-job-detail__timeline-time">{new Date(event.createdAt).toLocaleString('en-IN')}</span>
            </li>
          ))}
        </ul>
      )}

      {actionError && (
        <p className="tech-job-detail__error" role="alert">
          {actionError}
        </p>
      )}

      {upcomingStatus && (
        <div className="tech-job-detail__actions">
          <button type="button" className="btn btn--primary" onClick={handleAdvanceStatus} disabled={updating}>
            {updating ? 'Updating…' : nextStatusActionLabels[upcomingStatus]}
          </button>
        </div>
      )}
    </div>
  )
}
