import { useEffect, useState } from 'react'
import { TechnicianLayout } from '../components/TechnicianDashboard/TechnicianLayout'
import { TechSectionHeader } from '../components/TechnicianDashboard/TechSectionHeader'
import { StatCard } from '../components/TechnicianDashboard/StatCard'
import { BriefcaseIcon, ChartBarIcon, CheckCircleIcon, ClockIcon, CloseIcon } from '../components/icons/Icons'
import { getTechnicianPerformance } from '../lib/technicianPerformanceApi'
import type { TechnicianPerformance } from '../lib/technicianPerformanceApi'
import { usePageMeta } from '../lib/usePageMeta'

/**
 * Performance — /technician/performance. Real data — GET /api/technician/
 * performance/ (lib/technicianPerformanceApi.ts), computed straight from
 * this technician's own Booking rows. No "Average Rating"/"Customer
 * Satisfaction" cards — there's no rating/review feature anywhere in this
 * app yet, so there's nothing real to show for either (see that API
 * module's own header comment on why they're not fabricated).
 */
export function TechnicianPerformancePage() {
  const [performance, setPerformance] = useState<TechnicianPerformance | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading')

  usePageMeta('Performance | Urban Cool Technician Portal', 'Your job completion rate and response time.')

  useEffect(() => {
    let cancelled = false
    getTechnicianPerformance()
      .then((data) => {
        if (cancelled) return
        setPerformance(data)
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

  return (
    <TechnicianLayout>
      <section className="tech-section">
        <TechSectionHeader title="Performance Summary" />
        {loadState === 'loading' && <p className="tech-empty-note">Loading your performance…</p>}
        {loadState === 'error' && <p className="tech-empty-note">Couldn’t load your performance. Please refresh the page.</p>}
        {loadState === 'ready' && performance && (
          <div className="tech-stat-grid">
            <StatCard Icon={BriefcaseIcon} value={String(performance.totalJobs)} label="Total Jobs" />
            <StatCard Icon={CheckCircleIcon} value={String(performance.completedJobs)} label="Completed Jobs" />
            <StatCard Icon={CloseIcon} value={String(performance.cancelledJobs)} label="Cancelled Jobs" />
            <StatCard Icon={ChartBarIcon} value={`${performance.completionRate}%`} label="Completion Rate" />
            <StatCard
              Icon={ClockIcon}
              value={performance.avgResponseTimeMinutes === null ? '—' : `${performance.avgResponseTimeMinutes} min`}
              label="Average Response Time"
            />
          </div>
        )}
      </section>
    </TechnicianLayout>
  )
}
