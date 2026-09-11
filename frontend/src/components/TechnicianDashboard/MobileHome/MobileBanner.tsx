import { StarIcon } from '../../icons/Icons'
import { AcIllustration } from '../../icons/ApplianceIcons'

interface MobileBannerProps {
  variant: 'encouragement' | 'quote'
}

/**
 * The two soft banners that close out sections of the mobile home. Purely
 * editorial — no data, no action, no link — so they're a single component
 * with a variant rather than two near-identical files.
 */
export function MobileBanner({ variant }: MobileBannerProps) {
  if (variant === 'quote') {
    return (
      <aside className="mtech-banner mtech-banner--quote">
        <div className="mtech-banner__quote-body">
          <p className="mtech-banner__quote-text">
            <span aria-hidden="true">“</span>Small steps of good service lead to big success.
            <span aria-hidden="true">”</span>
          </p>
          <p className="mtech-banner__quote-source">— Urban Cool</p>
        </div>
        <AcIllustration className="mtech-banner__quote-art" aria-hidden="true" />
      </aside>
    )
  }

  return (
    <aside className="mtech-banner mtech-banner--encouragement">
      <span className="mtech-banner__badge" aria-hidden="true">
        <StarIcon />
      </span>
      <div className="mtech-banner__body">
        <p className="mtech-banner__title">Keep Up the Good Work!</p>
        <p className="mtech-banner__text">Your effort helps us deliver better service every day.</p>
        <span className="mtech-banner__tag">#TeamUrbanCool</span>
      </div>
    </aside>
  )
}
