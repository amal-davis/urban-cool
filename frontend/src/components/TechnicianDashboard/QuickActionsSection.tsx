import type { ComponentType, SVGProps } from 'react'
import { CameraIcon, ChatIcon, CheckCircleIcon, WalletIcon } from '../icons/Icons'
import { quickActions } from '../../data/technicianDashboardData'
import type { QuickActionInfo } from '../../data/technicianDashboardData'
import './QuickActionsSection.css'

const actionIcons: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  estimate: WalletIcon,
  photos: CameraIcon,
  complete: CheckCircleIcon,
  chat: ChatIcon,
}

interface QuickActionsSectionProps {
  onAction: (action: QuickActionInfo) => void
}

/** Compact grid of one-tap actions — Add Estimate / Upload Photos /
 *  Complete Job / Chat with Office. All four are "Coming soon" for now
 *  (see onAction's caller in TechnicianDashboardPage.tsx): the real actions
 *  need a job selected first, which no job-detail view exists for yet. */
export function QuickActionsSection({ onAction }: QuickActionsSectionProps) {
  return (
    <div className="tech-quick-actions">
      {quickActions.map((action) => {
        const Icon = actionIcons[action.id]
        return (
          <button key={action.id} type="button" className="tech-quick-action" onClick={() => onAction(action)}>
            <span className="tech-quick-action__icon" aria-hidden="true">
              <Icon />
            </span>
            <span className="tech-quick-action__label">{action.label}</span>
          </button>
        )
      })}
    </div>
  )
}
