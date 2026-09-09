import { useEffect, useState } from 'react'
import type { Service } from '../data/services'
import { getServices } from '../lib/servicesApi'
import { ServiceDetail } from '../components/Services/ServiceDetail'
import { ServiceNotFound } from '../components/ServiceDetailPage/ServiceNotFound'
import { PageHeader } from '../components/PageHeader/PageHeader'
import { GridIcon } from '../components/icons/Icons'
import { WhyChooseUs } from '../components/WhyChooseUs/WhyChooseUs'
import { ServiceAvailability } from '../components/ServiceAvailability/ServiceAvailability'
import { FinalCTA } from '../components/FinalCTA/FinalCTA'
import { Reveal } from '../components/Reveal/Reveal'
import { Skeleton } from '../components/Skeleton/Skeleton'
import { usePageMeta } from '../lib/usePageMeta'
import './skeletons/PageSkeletons.css'
import './ServicesPage.css'

type LoadState = 'loading' | 'error' | 'ready'

/**
 * Admin-controlled, not hardcoded — every card below is fetched from
 * GET /api/services/ (see lib/servicesApi.ts) and rendered in whatever
 * order/count Django Admin's Service rows are in. Adding, editing,
 * reordering, or deactivating a service there is reflected here on the next
 * load with no code change; previously this rendered exactly 4 fixed cards
 * (AC, Refrigerator, Washing Machine, Microwave) from data/services.ts.
 */
export function ServicesPage() {
  usePageMeta(
    'Services | Urban Cool',
    'Explore Urban Cool appliance repair and service solutions for AC, refrigerators, washing machines and microwaves in Kochi.',
  )

  const [state, setState] = useState<LoadState>('loading')
  const [services, setServices] = useState<Service[]>([])
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState('loading')

    getServices()
      .then((data) => {
        if (cancelled) return
        setServices(data)
        setState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setState('error')
      })

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  return (
    <>
      {/* Not wrapped in Reveal: above the fold on every load, same reasoning
          as HomePage's hero. */}
      <PageHeader
        icon={GridIcon}
        heading="Our Services"
        description="Reliable appliance repair and service solutions for your home."
      />

      {/* One section, one card per service — image, description, what we
          help with, and the booking CTA all together. */}
      <section className="services-overview" aria-labelledby="services-overview-heading">
        <div className="container">
          <div className="services-overview__intro">
            <h2 id="services-overview-heading" className="services-overview__heading">
              Explore Our Services
            </h2>
            <p className="services-overview__description">
              Choose the appliance service you need and book professional assistance with Urban Cool.
            </p>
          </div>

          {state === 'loading' && (
            <div className="skeleton-detail-list" role="status" aria-busy="true">
              <span className="visually-hidden">Loading services…</span>
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="skeleton-detail-card">
                  <Skeleton className="skeleton-detail-card__media" />
                  <div className="skeleton-detail-card__content">
                    <Skeleton className="skeleton-heading skeleton-heading--sm" />
                    <Skeleton className="skeleton-text" />
                    <Skeleton className="skeleton-text skeleton-text--short" />
                    <Skeleton className="skeleton-button" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {state === 'error' && (
            <ServiceNotFound
              heading="Something Went Wrong"
              description="We couldn't load our services right now. Please check your connection and try again."
              headingLevel="h2"
              onRetry={() => setReloadToken((n) => n + 1)}
            />
          )}

          {state === 'ready' && services.length === 0 && (
            <ServiceNotFound
              heading="No Services Available"
              description="We don't have any services listed right now. Please check back soon."
              headingLevel="h2"
            />
          )}

          {state === 'ready' && services.length > 0 && (
            <div className="services-overview__list">
              {/* Each card reveals individually as it's scrolled to, rather
                  than the whole stack fading in at once — a real stagger,
                  not four identical entrances landing together. */}
              {services.map((service, index) => (
                <Reveal key={service.id}>
                  <ServiceDetail service={service} reverse={index % 2 === 1} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <Reveal>
        <WhyChooseUs />
      </Reveal>
      <Reveal>
        <ServiceAvailability />
      </Reveal>
      <Reveal>
        <FinalCTA />
      </Reveal>
    </>
  )
}
