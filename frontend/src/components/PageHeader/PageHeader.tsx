import type { ComponentType, SVGProps } from 'react'
import './PageHeader.css'

interface PageHeaderProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  heading: string
  description: string
}

/**
 * Compact page-intro band — shared by every secondary page (Contact,
 * Services, ...) so they carry one consistent "you've arrived on page X"
 * treatment instead of each page inventing its own. Extracted from what was
 * originally ContactPage-only markup; Contact's own visual result is
 * unchanged, this is a mechanical dedup, not a redesign.
 */
export function PageHeader({ icon: Icon, heading, description }: PageHeaderProps) {
  return (
    <section className="page-header">
      <div className="container">
        <span className="page-header__badge" aria-hidden="true">
          <Icon />
        </span>
        <h1 className="page-header__heading">{heading}</h1>
        <p className="page-header__description">{description}</p>
      </div>
    </section>
  )
}
