import type { ComponentType, SVGProps } from 'react'
import type { WorkflowStepInfo } from '../../data/technicianDashboardData'
import './WorkflowCard.css'

interface WorkflowCardProps {
  step: WorkflowStepInfo
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  onAction: (step: WorkflowStepInfo) => void
}

/** One step of the 5-step job workflow (Accept -> Start -> Estimate ->
 *  Photos -> Complete) — see JobWorkflowSection.tsx for how these connect
 *  into a row. */
export function WorkflowCard({ step, Icon, onAction }: WorkflowCardProps) {
  return (
    <div className="tech-workflow-card">
      <span className="tech-workflow-card__step">Step {step.step}</span>
      <span className="tech-workflow-card__icon" aria-hidden="true">
        <Icon />
      </span>
      <h3 className="tech-workflow-card__title">{step.title}</h3>
      <p className="tech-workflow-card__description">{step.description}</p>
      <button type="button" className="btn btn--ghost tech-workflow-card__action" onClick={() => onAction(step)}>
        {step.actionLabel}
      </button>
    </div>
  )
}
