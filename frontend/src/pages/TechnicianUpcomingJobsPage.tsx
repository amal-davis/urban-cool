import { useEffect, useMemo, useState } from 'react'
import { TechnicianLayout } from '../components/TechnicianDashboard/TechnicianLayout'
import { TechSectionHeader } from '../components/TechnicianDashboard/TechSectionHeader'
import { TechFilterTabs } from '../components/TechnicianDashboard/TechFilterTabs'
import { JobCard } from '../components/TechnicianDashboard/JobCard'
import { JobDetailModal } from '../components/TechnicianDashboard/JobDetailModal'
import { Toast } from '../components/Toast/Toast'
import {
  getTechnicianJobs,
  isJobOutstanding,
  isJobThisWeek,
  isJobToday,
  isJobTomorrow,
} from '../lib/technicianJobsApi'
import type { TechnicianJob } from '../lib/technicianJobsApi'
import { usePageMeta } from '../lib/usePageMeta'

type FilterId = 'today' | 'tomorrow' | 'this_week' | 'upcoming'

const filterOptions: { id: FilterId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'this_week', label: 'This Week' },
  { id: 'upcoming', label: 'Upcoming' },
]

/**
 * Upcoming Jobs — /technician/upcoming-jobs. Real data (lib/
 * technicianJobsApi.ts) — future jobs not yet completed or cancelled
 * (isJobOutstanding). "Upcoming" is the catch-all (every outstanding job);
 * Today/Tomorrow/This Week narrow it further by date.
 */
export function TechnicianUpcomingJobsPage() {
  const [jobs, setJobs] = useState<TechnicianJob[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [filter, setFilter] = useState<FilterId>('upcoming')
  const [selectedJob, setSelectedJob] = useState<TechnicianJob | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  usePageMeta('Upcoming Jobs | Urban Cool Technician Portal', 'Your future scheduled jobs.')

  useEffect(() => {
    let cancelled = false
    getTechnicianJobs()
      .then((data) => {
        if (cancelled) return
        setJobs(data.filter(isJobOutstanding))
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

  const filteredJobs = useMemo(() => {
    switch (filter) {
      case 'today':
        return jobs.filter((job) => isJobToday(job.bookingDate))
      case 'tomorrow':
        return jobs.filter((job) => isJobTomorrow(job.bookingDate))
      case 'this_week':
        return jobs.filter((job) => isJobThisWeek(job.bookingDate))
      default:
        return jobs
    }
  }, [jobs, filter])

  function handleStatusUpdated(updated: TechnicianJob) {
    // This page only ever lists outstanding jobs (isJobOutstanding, applied
    // once at fetch time above) — an update that moves a job to 'completed'
    // must drop it from the list here too, not just patch it in place,
    // or it would keep showing as "upcoming" until the next full reload.
    setJobs((current) => current.map((job) => (job.id === updated.id ? updated : job)).filter(isJobOutstanding))
    setToastMessage(`Status updated to “${updated.statusLabel}”.`)
  }

  return (
    <TechnicianLayout>
      <section className="tech-section">
        <TechSectionHeader title="Upcoming Jobs" />
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
          <p className="tech-empty-note">No upcoming jobs in this range.</p>
        )}
      </section>

      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} onStatusUpdated={handleStatusUpdated} />
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </TechnicianLayout>
  )
}
