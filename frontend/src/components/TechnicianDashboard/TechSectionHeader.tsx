import { Link } from 'react-router-dom'
import './TechSectionHeader.css'

interface TechSectionHeaderProps {
  title: string
  linkTo?: string
  linkLabel?: string
}

/** "Section Title ................ View All →" — reused by every dashboard
 *  section that needs it (Today's Jobs, Job Workflow, Performance Summary,
 *  ...) instead of each one re-typing the same flex row. */
export function TechSectionHeader({ title, linkTo, linkLabel }: TechSectionHeaderProps) {
  return (
    <div className="tech-section-header">
      <h2 className="tech-section-header__title">{title}</h2>
      {linkTo && linkLabel && (
        <Link to={linkTo} className="tech-section-header__link">
          {linkLabel}
        </Link>
      )}
    </div>
  )
}
