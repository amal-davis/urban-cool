import { features } from '../../data/features'
import './WhyChooseUs.css'

// One feature gets spotlighted as a larger, standalone card; the rest render
// as a compact list. Six identical icon+heading+text tiles in a uniform grid
// is a well-known generic pattern — this asymmetry is a deliberate fix for
// that, not a random layout choice. "Multiple Appliance Services" is picked
// as the spotlight because it's the most concrete, Urban-Cool-specific claim
// (one place for four appliance types) rather than a generic service promise
// any competitor could also make.
const spotlightId = 'multiple-appliances'
const spotlight = features.find((feature) => feature.id === spotlightId)!
const rest = features.filter((feature) => feature.id !== spotlightId)

export function WhyChooseUs() {
  return (
    <section className="why-choose-us" aria-labelledby="why-choose-us-heading">
      <div className="container">
        <div className="why-choose-us__intro">
          <h2 id="why-choose-us-heading" className="why-choose-us__heading">
            Why Choose Urban Cool?
          </h2>
          <p className="why-choose-us__description">
            Booking appliance repair shouldn't be complicated. Urban Cool connects you with skilled
            technicians for AC, refrigerator, washing machine, and microwave service — all in one place.
          </p>
        </div>

        <div className="why-choose-us__layout">
          <article className="feature-spotlight">
            <span className="feature-spotlight__icon" aria-hidden="true">
              <spotlight.Icon />
            </span>
            <h3 className="feature-spotlight__title">{spotlight.title}</h3>
            <p className="feature-spotlight__description">{spotlight.description}</p>
          </article>

          <ul className="feature-list">
            {rest.map(({ id, title, description, Icon }) => (
              <li key={id} className="feature-list__item">
                <span className="feature-list__icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="feature-list__text">
                  <span className="feature-list__title">{title}</span>
                  <span className="feature-list__description">{description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
