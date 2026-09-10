import './TechFilterTabs.css'

interface TechFilterTabsProps<T extends string> {
  options: { id: T; label: string }[]
  active: T
  onChange: (id: T) => void
}

/** Horizontally-scrollable filter pill row — shared by My Jobs (All/
 *  Assigned/Accepted/In Progress/Completed), Upcoming Jobs (Today/Tomorrow/
 *  This Week/Upcoming), and Job History (Today/This Week/This Month), each
 *  with its own option set via the generic `T`. Scrolls rather than wraps
 *  on narrow screens so the row never pushes content below it around. */
export function TechFilterTabs<T extends string>({ options, active, onChange }: TechFilterTabsProps<T>) {
  return (
    <div className="tech-filter-tabs" role="tablist">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={option.id === active}
          className={`tech-filter-tab${option.id === active ? ' is-active' : ''}`}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
