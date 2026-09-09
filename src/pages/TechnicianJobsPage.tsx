import { useEffect, useMemo, useState } from 'react'
import { TechnicianLayout } from '../components/TechnicianDashboard/TechnicianLayout'
import { TechSectionHeader } from '../components/TechnicianDashboard/TechSectionHeader'
import { TechFilterTabs } from '../components/TechnicianDashboard/TechFilterTabs'
import { JobCard } from '../components/TechnicianDashboard/JobCard'
import { JobDetailModal } from '../components/TechnicianDashboard/JobDetailModal'
import { Toast } from '../components/Toast/Toast'
import { statusGroup } from '../lib/bookingApi'
import type { BookingStatusGroup } from '../lib/bookingApi'
import { getTechnicianJobs } from '../lib/technicianJobsApi'
import type { TechnicianJob } from '../lib/technicianJobsApi'
import { usePageMeta } from '../lib/usePageMeta'

type FilterId = 'all' | BookingStatusGroup

const filterOptions: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

/**
 * My Jobs — /technician/jobs. Every job assigned to this technician,
 * regardless of date (see the dashboard's own Today's Jobs for the date-
 * scoped subset, and /technician/upcoming-jobs / /technician/job-history
 * for the other date-scoped views). Real data — GET /api/technician/jobs/
 * (lib/technicianJobsApi.ts). Filters use the same 4-group status
 * vocabulary (statusGroup, lib/bookingApi.ts) the customer dashboard's own
 * StatusBadge already uses, rather than the brief's literal "Assigned/
 * Accepted" labels — those two don't exist as distinct Booking statuses
 * once a technician is actually assigned (see backend/bookings/models.py's
 * Booking.save(), which auto-advances straight to ASSIGNED), so they'd
 * collapse onto the same "Upcoming" bucket regardless.
 */
export function TechnicianJobsPage() {
  const [jobs, setJobs] = useState<TechnicianJob[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [filter, setFilter] = useState<FilterId>('all')
  const [selectedJob, setSelectedJob] = useState<TechnicianJob | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  usePageMeta('My Jobs | Urban Cool Technician Portal', 'All jobs assigned to you, with status filters.')

  useEffect(() => {
    let cancelled = false
    getTechnicianJobs()
      .then((data) => {
        if (cancelled) return
        setJobs(data)
        setLoadState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filteredJobs = useMemo(
    () => (filter === 'all' ? jobs : jobs.filter((job) => statusGroup(job.status) === filter)),
    [jobs, filter],
  )

  function handleStatusUpdated(updated: TechnicianJob) {
    setJobs((current) => current.map((job) => (job.id === updated.id ? updated : job)))
    setToastMessage(`Status updated to “${updated.statusLabel}”.`)
  }

  return (
    <TechnicianLayout>
      <section className="tech-section">
        <TechSectionHeader title="My Jobs" />
        <TechFilterTabs options={filterOptions} active={filter} onChange={setFilter} />

        {loadState === 'loading' && <p className="tech-empty-note">Loading your jobs…</p>}
        {loadState === 'error' && <p className="tech-empty-note">Couldn’t load your jobs. Please refresh the page.</p>}
        {loadState === 'ready' && filteredJobs.length > 0 && (
          <div className="tech-job-list">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} onAction={setSelectedJob} />
            ))}
          </div>
        )}
        {loadState === 'ready' && filteredJobs.length === 0 && (
          <p className="tech-empty-note">No jobs match this filter.</p>
        )}
      </section>

      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} onStatusUpdated={handleStatusUpdated} />
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </TechnicianLayout>
  )
}
