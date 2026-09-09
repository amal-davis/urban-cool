import { useEffect, useState } from 'react'
import { TechnicianLayout } from '../components/TechnicianDashboard/TechnicianLayout'
import { TechSectionHeader } from '../components/TechnicianDashboard/TechSectionHeader'
import { StatCard } from '../components/TechnicianDashboard/StatCard'
import { CommissionProgress } from '../components/TechnicianDashboard/CommissionProgress'
import { ChartBarIcon, CheckCircleIcon, ClockIcon, WalletIcon } from '../components/icons/Icons'
import { getTechnicianEarnings } from '../lib/technicianEarningsApi'
import type { TechnicianEarnings } from '../lib/technicianEarningsApi'
import { formatAmount } from '../data/technicianDashboardData'
import { usePageMeta } from '../lib/usePageMeta'

/**
 * Earnings & Commission — /technician/earnings. Real data — GET /api/
 * technician/earnings/ (lib/technicianEarningsApi.ts), computed from this
 * technician's own bookings' commission_amount/commission_paid (both set
 * by an admin — see that API module's own header comment). A technician
 * with no priced jobs yet just sees zeros across the board, not an error —
 * that's a legitimately empty state, not a failure.
 */
export function TechnicianEarningsPage() {
  const [earnings, setEarnings] = useState<TechnicianEarnings | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'error' | 'ready'>('loading')

  usePageMeta('Earnings & Commission | Urban Cool Technician Portal', 'Your earnings, commission, and payout summary.')

  useEffect(() => {
    let cancelled = false
    getTechnicianEarnings()
      .then((data) => {
        if (cancelled) return
        setEarnings(data)
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
        <TechSectionHeader title="Earnings & Commission" />
        {loadState === 'loading' && <p className="tech-empty-note">Loading your earnings…</p>}
        {loadState === 'error' && <p className="tech-empty-note">Couldn’t load your earnings. Please refresh the page.</p>}
        {loadState === 'ready' && earnings && (
          <div className="tech-stat-grid">
            <StatCard Icon={WalletIcon} value={formatAmount(earnings.monthCommissionEarned)} label="This Month Commission" />
            <StatCard Icon={ChartBarIcon} value={formatAmount(earnings.totalServiceValue)} label="Total Service Value" />
            <StatCard Icon={ChartBarIcon} value={formatAmount(earnings.totalCommissionEarned)} label="Commission Earned" />
            <StatCard Icon={ClockIcon} value={formatAmount(earnings.pendingPayout)} label="Pending Payout" />
            <StatCard Icon={CheckCircleIcon} value={formatAmount(earnings.paidAmount)} label="Paid Amount" />
          </div>
        )}
      </section>

      {loadState === 'ready' && earnings && (
        <section className="tech-section">
          <TechSectionHeader title="Commission Breakdown" />
          <CommissionProgress
            totalServiceValue={earnings.totalServiceValue}
            commissionEarned={earnings.totalCommissionEarned}
            commissionRate={earnings.commissionRate}
          />
        </section>
      )}
    </TechnicianLayout>
  )
}
