import { CheckCircleIcon } from '../icons/Icons'

interface IncludedServicesProps {
  items: string[]
}

/** "Services Include" checklist — one check icon + label per line, reusing
 *  the same CheckCircleIcon/success-green treatment the Services page's
 *  "What We Can Help With" list already uses, rather than a new icon. */
export function IncludedServices({ items }: IncludedServicesProps) {
  return (
    <div className="service-detail__included">
      <h2 className="service-detail__section-heading">Services Include</h2>
      <ul className="service-detail__included-list">
        {items.map((item) => (
          <li key={item}>
            <CheckCircleIcon aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
