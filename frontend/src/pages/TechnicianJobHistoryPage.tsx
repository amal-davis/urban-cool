import { useEffect, useMemo, useState } from 'react'
import { TechnicianLayout } from '../components/TechnicianDashboard/TechnicianLayout'
import { TechSectionHeader } from '../components/TechnicianDashboard/TechSectionHeader'
import { TechFilterTabs } from '../components/TechnicianDashboard/TechFilterTabs'
import { JobCard } from '../components/TechnicianDashboard/JobCard'
import { JobDetailModal } from '../components/TechnicianDashboard/JobDetailModal'
import { Toast } from '../components/Toast/Toast'
import { getTechnicianJobs, isJobThisMonth, isJobThisWeek, isJobToday } from '../lib/technicianJobsApi'
import type { TechnicianJob } from '../lib/technicianJobsApi'
import { usePageMeta } from '../lib/usePageMeta'

type FilterId = 'today' | 'this_week' | 'this_month'

const filterOptions: { id: FilterId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
]

/**
 * Job History — /technician/job-history. Real data (lib/
 * technicianJobsApi.ts) — completed jobs only. "View Details" opens
 * JobDetailModal same as everywhere else in this dashboard; it never shows
 * a status-advance button here since a completed job has no next status
 * (nextJobStatus('completed') is null).
 */
export function TechnicianJobHistoryPage() {
  const [jobs, setJobs] = useState<TechnicianJob[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [filter, setFilter] = useState<FilterId>('this_month')
  const [selectedJob, setSelectedJob] = useState<TechnicianJob | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  usePageMeta('Job History | Urban Cool Technician Portal', 'Your completed service jobs.')

  useEffect(() => {
    let cancelled = false
    getTechnicianJobs()
      .then((data) => {
        if (cancelled) return
        setJobs(data.filter((job) => job.status === 'completed'))
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
      case 'this_week':
        return jobs.filter((job) => isJobThisWeek(job.bookingDate))
      default:
        return jobs.filter((job) => isJobThisMonth(job.bookingDate))
    }
  }, [jobs, filter])

  function handleStatusUpdated(updated: TechnicianJob) {
    setJobs((current) => current.map((job) => (job.id === updated.id ? updated : job)))
    setToastMessage(`Status updated to “${updated.statusLabel}”.`)
  }

  return (
    <TechnicianLayout>
      <section className="tech-section">
        <TechSectionHeader title="Job History" />
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
          <p className="tech-empty-note">No completed jobs in this range.</p>
        )}
      </section>

      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} onStatusUpdated={handleStatusUpdated} />
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </TechnicianLayout>
  )
}
