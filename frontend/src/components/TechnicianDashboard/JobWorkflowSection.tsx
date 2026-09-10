import { BriefcaseIcon, CameraIcon, CheckCircleIcon, ShieldCheckIcon, WalletIcon } from '../icons/Icons'
import { workflowSteps } from '../../data/technicianDashboardData'
import type { WorkflowStepInfo } from '../../data/technicianDashboardData'
import { WorkflowCard } from './WorkflowCard'
import './JobWorkflowSection.css'

// One icon per fixed step (workflowSteps.ts's own docstring explains why
// the steps themselves stay icon-free data) — index-aligned with
// workflowSteps, not step-number-keyed, since the 5 steps are a fixed,
// ordered sequence rather than something looked up individually.
const stepIcons = [CheckCircleIcon, BriefcaseIcon, WalletIcon, CameraIcon, ShieldCheckIcon]

interface JobWorkflowSectionProps {
  onStepAction: (step: WorkflowStepInfo) => void
}

/** Connected row of the 5 workflow steps — horizontally scrollable on
 *  mobile/tablet (JobWorkflowSection.css), an even grid on desktop. The
 *  connecting line between cards is a single background gradient on the
 *  row itself (::before), not per-card borders, so it reads as one
 *  continuous path rather than 5 separate boxes. */
export function JobWorkflowSection({ onStepAction }: JobWorkflowSectionProps) {
  return (
    <div className="tech-workflow">
      <div className="tech-workflow__track">
        {workflowSteps.map((step, index) => (
          <WorkflowCard key={step.step} step={step} Icon={stepIcons[index]} onAction={onStepAction} />
        ))}
      </div>
    </div>
  )
}
