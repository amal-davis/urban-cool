import { AcIllustration } from '../../icons/ApplianceIcons'
import { timeOfDayGreeting } from '../../../lib/greeting'

interface MobileGreetingBannerProps {
  name: string
}

/**
 * The mobile home's opening banner — the one place the greeting appears on
 * this page (TechnicianHeader's own copy of it is hidden below 1024px via
 * `hideGreetingOnMobile`, so it never reads twice).
 *
 * The reference design puts a photo of a technician servicing an AC here.
 * No such photo exists in this project and one stock photo of a stranger
 * standing in for "you, the technician looking at this screen" would be
 * worse than none — so the appliance illustration already used everywhere
 * else fills the same compositional role instead, oversized and low-contrast
 * behind the copy.
 */
export function MobileGreetingBanner({ name }: MobileGreetingBannerProps) {
  const firstName = name.split(' ')[0]

  return (
    <div className="mtech-greeting">
      <AcIllustration className="mtech-greeting__art" aria-hidden="true" />

      <p className="mtech-greeting__eyebrow">{timeOfDayGreeting()},</p>
      <p className="mtech-greeting__name">
        {firstName} <span aria-hidden="true">👋</span>
      </p>
      <p className="mtech-greeting__tagline">Great service makes a cooler tomorrow.</p>
    </div>
  )
}
