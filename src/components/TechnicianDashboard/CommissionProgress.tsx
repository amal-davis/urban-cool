import './CommissionProgress.css'

interface CommissionProgressProps {
  totalServiceValue: number
  commissionEarned: number
  /** 0–100 */
  commissionRate: number
}

/** A plain CSS bar, not a charting library — this project has none
 *  installed (checked package.json first) and the brief explicitly says
 *  not to add one for something this simple. Shows commission earned as a
 *  share of total service value completed this month. */
export function CommissionProgress({ totalServiceValue, commissionEarned, commissionRate }: CommissionProgressProps) {
  return (
    <div className="tech-commission-progress">
      <div className="tech-commission-progress__row">
        <span>Commission Earned</span>
        <span className="tech-commission-progress__rate">{commissionRate}% of service value</span>
      </div>
      <div className="tech-commission-progress__track" role="img" aria-label={`${commissionRate}% commission rate`}>
        <div className="tech-commission-progress__fill" style={{ width: `${Math.min(commissionRate, 100)}%` }} />
      </div>
      <div className="tech-commission-progress__row tech-commission-progress__row--muted">
        <span>₹{commissionEarned.toLocaleString('en-IN')} earned</span>
        <span>of ₹{totalServiceValue.toLocaleString('en-IN')} service value</span>
      </div>
    </div>
  )
}
