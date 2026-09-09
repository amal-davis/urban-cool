import { useEffect, useState } from 'react'
import { TechnicianLayout } from '../components/TechnicianDashboard/TechnicianLayout'
import { TechSectionHeader } from '../components/TechnicianDashboard/TechSectionHeader'
import { StatCard } from '../components/TechnicianDashboard/StatCard'
import { JobCard } from '../components/TechnicianDashboard/JobCard'
import { JobDetailModal } from '../components/TechnicianDashboard/JobDetailModal'
import { JobWorkflowSection } from '../components/TechnicianDashboard/JobWorkflowSection'
import { QuickActionsSection } from '../components/TechnicianDashboard/QuickActionsSection'
import { CommissionProgress } from '../components/TechnicianDashboard/CommissionProgress'
import { Toast } from '../components/Toast/Toast'
import { BriefcaseIcon, ChartBarIcon, CheckCircleIcon, ClockIcon, WalletIcon } from '../components/icons/Icons'
import { statusGroup } from '../lib/bookingApi'
import { getTechnicianJobs, isJobToday } from '../lib/technicianJobsApi'
import type { TechnicianJob } from '../lib/technicianJobsApi'
import { getTechnicianPerformance } from '../lib/technicianPerformanceApi'
import type { TechnicianPerformance } from '../lib/technicianPerformanceApi'
import { getTechnicianEarnings } from '../lib/technicianEarningsApi'
import type { TechnicianEarnings } from '../lib/technicianEarningsApi'
import { formatAmount } from '../data/technicianDashboardData'
import { useTechnicianAuth } from '../lib/TechnicianAuthContext'
import { usePageMeta } from '../lib/usePageMeta'
import './TechnicianDashboardPage.css'

type LoadState = 'loading' | 'error' | 'ready'

/**
 * Technician Dashboard overview — /technician/dashboard. Reachable only via
 * TechnicianProtectedRoute (see App.tsx), so `technician` is always set by
 * the time this renders.
 *
 * Today's Jobs, the Assigned/In Progress/Completed job counts, the
 * Performance Summary preview, and Earnings & Commission are all real —
 * fetched from GET /api/technician/jobs/, GET /api/technician/performance/,
 * and GET /api/technician/earnings/ (lib/technicianJobsApi.ts, lib/
 * technicianPerformanceApi.ts, lib/technicianEarningsApi.ts).
 */
export function TechnicianDashboardPage() {
  const { technician } = useTechnicianAuth()
  const [jobs, setJobs] = useState<TechnicianJob[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [performance, setPerformance] = useState<TechnicianPerformance | null>(null)
  const [performanceLoadState, setPerformanceLoadState] = useState<LoadState>('loading')
  const [earnings, setEarnings] = useState<TechnicianEarnings | null>(null)
  const [earningsLoadState, setEarningsLoadState] = useState<LoadState>('loading')
  const [selectedJob, setSelectedJob] = useState<TechnicianJob | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  usePageMeta('Technician Dashboard | Urban Cool', 'Urban Cool Technician Portal — your work overview for today.')

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

  useEffect(() => {
    let cancelled = false
    getTechnicianPerformance()
      .then((data) => {
        if (cancelled) return
        setPerformance(data)
        setPerformanceLoadState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setPerformanceLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    getTechnicianEarnings()
      .then((data) => {
        if (cancelled) return
        setEarnings(data)
        setEarningsLoadState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setEarningsLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  function handleStatusUpdated(updated: TechnicianJob) {
    setJobs((current) => current.map((job) => (job.id === updated.id ? updated : job)))
    setToastMessage(`Status updated to “${updated.statusLabel}”.`)
  }

  function handleComingSoon() {
    setToastMessage('This action isn’t connected yet — coming soon.')
  }

  if (!technician) return null

  const todaysJobs = jobs.filter((job) => isJobToday(job.bookingDate))
  const assignedCount = jobs.filter((job) => job.status === 'assigned').length
  const inProgressCount = jobs.filter((job) => statusGroup(job.status) === 'in-progress').length
  const completedCount = jobs.filter((job) => job.status === 'completed').length

  return (
    <TechnicianLayout>
      <section className="tech-section">
        <div className="tech-stat-grid">
          <StatCard Icon={BriefcaseIcon} value={loadState === 'ready' ? String(assignedCount) : '—'} label="Assigned Jobs" />
          <StatCard Icon={ClockIcon} value={loadState === 'ready' ? String(inProgressCount) : '—'} label="Jobs In Progress" />
          <StatCard Icon={CheckCircleIcon} value={loadState === 'ready' ? String(completedCount) : '—'} label="Completed Jobs" />
          <StatCard
            Icon={WalletIcon}
            value={earningsLoadState === 'ready' && earnings ? formatAmount(earnings.monthCommissionEarned) : '—'}
            label="This Month Commission"
          />
        </div>
      </section>

      <section className="tech-section">
        <TechSectionHeader title="Today’s Jobs" linkTo="/technician/jobs" linkLabel="View All Jobs" />
        {loadState === 'loading' && <p className="tech-empty-note">Loading your jobs…</p>}
        {loadState === 'error' && <p className="tech-empty-note">Couldn’t load your jobs. Please refresh the page.</p>}
        {loadState === 'ready' && todaysJobs.length > 0 && (
          <div className="tech-job-list">
            {todaysJobs.map((job) => (
              <JobCard key={job.id} job={job} onAction={setSelectedJob} />
            ))}
          </div>
        )}
        {loadState === 'ready' && todaysJobs.length === 0 && (
          <p className="tech-empty-note">No jobs scheduled for today.</p>
        )}
      </section>

      <section className="tech-section">
        <TechSectionHeader title="Job Workflow" />
        <JobWorkflowSection onStepAction={handleComingSoon} />
      </section>

      <section className="tech-section">
        <TechSectionHeader title="Quick Actions" />
        <QuickActionsSection onAction={handleComingSoon} />
      </section>

      <section className="tech-section">
        <TechSectionHeader title="Earnings & Commission" linkTo="/technician/earnings" linkLabel="View Earnings" />
        {earningsLoadState === 'loading' && <p className="tech-empty-note">Loading your earnings…</p>}
        {earningsLoadState === 'error' && (
          <p className="tech-empty-note">Couldn’t load your earnings. Please refresh the page.</p>
        )}
        {earningsLoadState === 'ready' && earnings && (
          <div className="tech-dashboard-earnings">
            <div className="tech-stat-grid">
              <StatCard Icon={WalletIcon} value={formatAmount(earnings.monthCommissionEarned)} label="This Month Commission" />
              <StatCard Icon={ChartBarIcon} value={formatAmount(earnings.totalCommissionEarned)} label="Commission Earned" />
              <StatCard Icon={ClockIcon} value={formatAmount(earnings.pendingPayout)} label="Pending Payout" />
              <StatCard Icon={CheckCircleIcon} value={formatAmount(earnings.paidAmount)} label="Paid Amount" />
            </div>
            <CommissionProgress
              totalServiceValue={earnings.totalServiceValue}
              commissionEarned={earnings.totalCommissionEarned}
              commissionRate={earnings.commissionRate}
            />
          </div>
        )}
      </section>

      <section className="tech-section">
        <TechSectionHeader title="Performance Summary" linkTo="/technician/performance" linkLabel="View Performance Details" />
        {performanceLoadState === 'loading' && <p className="tech-empty-note">Loading your performance…</p>}
        {performanceLoadState === 'error' && (
          <p className="tech-empty-note">Couldn’t load your performance. Please refresh the page.</p>
        )}
        {performanceLoadState === 'ready' && performance && (
          <div className="tech-stat-grid">
            <StatCard Icon={BriefcaseIcon} value={String(performance.totalJobs)} label="Total Jobs" />
            <StatCard Icon={CheckCircleIcon} value={String(performance.completedJobs)} label="Jobs Completed" />
            <StatCard
              Icon={ClockIcon}
              value={performance.avgResponseTimeMinutes === null ? '—' : `${performance.avgResponseTimeMinutes} min`}
              label="Response Time"
            />
            <StatCard Icon={ChartBarIcon} value={`${performance.completionRate}%`} label="Completion Rate" />
          </div>
        )}
      </section>

      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} onStatusUpdated={handleStatusUpdated} />
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </TechnicianLayout>
  )
}
