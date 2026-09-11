import { ClockIcon, WalletIcon } from '../../icons/Icons'
import { formatAmount } from '../../../data/technicianDashboardData'
import type { TechnicianEarnings } from '../../../lib/technicianEarningsApi'

interface MobileEarningsSectionProps {
  earnings: TechnicianEarnings
}

/**
 * ⚠ Shape only — there is no monthly-earnings history anywhere in this
 * project. GET /api/technician/earnings/ returns four running totals and
 * nothing time-series (see lib/technicianEarningsApi.ts's TechnicianEarnings),
 * so these bars describe no real month.
 *
 * They exist because the mobile design calls for a trend at this spot and
 * the intent is to wire one up later. Two rules keep that from turning into
 * a lie in the meantime: the bars carry **no numeric labels** (nothing
 * fabricated is ever printed as a figure), and the month ticks are computed
 * from today's date rather than hardcoded, so the axis can't quietly go
 * stale while looking authoritative.
 *
 * When a real endpoint lands, delete this constant and pass the real series
 * in as a prop — the markup below doesn't need to change.
 */
const ILLUSTRATIVE_TREND = [0.42, 0.5, 0.46, 0.62, 0.72, 1]

function recentMonthLabels(count: number): string[] {
  const now = new Date()
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1)
    return date.toLocaleDateString('en-IN', { month: 'short' })
  })
}

/** Earnings at a glance: four real figures from the earnings API, plus the
 *  illustrative trend documented above. */
export function MobileEarningsSection({ earnings }: MobileEarningsSectionProps) {
  const months = recentMonthLabels(ILLUSTRATIVE_TREND.length)

  return (
    <div className="mtech-earnings">
      <div className="mtech-earnings__top">
        <div className="mtech-earnings__headline">
          <span className="mtech-earnings__icon" aria-hidden="true">
            <WalletIcon />
          </span>
          <span className="mtech-earnings__amount">{formatAmount(earnings.monthCommissionEarned)}</span>
          <span className="mtech-earnings__caption">This Month</span>

          <span className="mtech-earnings__divider" aria-hidden="true" />

          <span className="mtech-earnings__amount mtech-earnings__amount--secondary">
            {formatAmount(earnings.totalCommissionEarned)}
          </span>
          <span className="mtech-earnings__caption">Total Earned</span>
        </div>

        {/* aria-hidden: it depicts nothing real yet (see ILLUSTRATIVE_TREND
            above), so it has nothing to announce to a screen reader — the
            four figures around it are the actual content. */}
        <div className="mtech-earnings__chart" aria-hidden="true">
          <div className="mtech-earnings__bars">
            {ILLUSTRATIVE_TREND.map((height, index) => (
              <span
                key={months[index]}
                className={`mtech-earnings__bar${index === ILLUSTRATIVE_TREND.length - 1 ? ' mtech-earnings__bar--current' : ''}`}
                style={{ height: `${height * 100}%` }}
              />
            ))}
          </div>
          <div className="mtech-earnings__months">
            {months.map((month) => (
              <span key={month}>{month}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mtech-earnings__split">
        <div className="mtech-earnings__tile mtech-earnings__tile--tone-2">
          <span className="mtech-earnings__tile-icon" aria-hidden="true">
            <ClockIcon />
          </span>
          <span className="mtech-earnings__tile-value">{formatAmount(earnings.pendingPayout)}</span>
          <span className="mtech-earnings__tile-label">Pending Payout</span>
        </div>

        <div className="mtech-earnings__tile mtech-earnings__tile--tone-3">
          <span className="mtech-earnings__tile-icon" aria-hidden="true">
            <WalletIcon />
          </span>
          <span className="mtech-earnings__tile-value">{formatAmount(earnings.paidAmount)}</span>
          <span className="mtech-earnings__tile-label">Paid Out</span>
        </div>
      </div>
    </div>
  )
}
