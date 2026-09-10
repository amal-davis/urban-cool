import { steps } from '../../data/steps'
import './HowItWorks.css'

export function HowItWorks() {
  return (
    <section className="how-it-works" aria-labelledby="how-it-works-heading">
      <div className="container">
        <div className="how-it-works__intro">
          <h2 id="how-it-works-heading" className="how-it-works__heading">
            How It Works
          </h2>
          <p className="how-it-works__description">
            Book your appliance service in just a few simple steps.
          </p>
        </div>

        <ol className="how-it-works__steps">
          {steps.map(({ id, number, title, description, Icon }) => (
            <li key={id} className="step">
              <span className="step__number" aria-hidden="true">
                {number}
              </span>
              <span className="step__icon" aria-hidden="true">
                <Icon />
              </span>
              <h3 className="step__title">{title}</h3>
              <p className="step__description">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
