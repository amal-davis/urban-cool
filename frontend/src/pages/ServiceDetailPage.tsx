import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Service } from '../data/services'
import { getServiceDetail, ServicesApiError } from '../lib/servicesApi'
import { ServiceDetailTopBar } from '../components/ServiceDetailPage/ServiceDetailTopBar'
import { ServiceHero } from '../components/ServiceDetailPage/ServiceHero'
import { IncludedServices } from '../components/ServiceDetailPage/IncludedServices'
import { TechnicianTrust } from '../components/ServiceDetailPage/TechnicianTrust'
import { EstimatedPrice } from '../components/ServiceDetailPage/EstimatedPrice'
import { BookingCTA } from '../components/ServiceDetailPage/BookingCTA'
import { ServiceNotFound } from '../components/ServiceDetailPage/ServiceNotFound'
import { ServiceDetailPageSkeleton } from './skeletons/ServiceDetailPageSkeleton'
import { usePageMeta } from '../lib/usePageMeta'
import '../components/ServiceDetailPage/ServiceDetailPage.css'

type LoadState = 'loading' | 'not-found' | 'error' | 'ready'

/**
 * Reusable service detail page — one route (/service/:serviceId), one
 * component, driven entirely by GET /api/services/:slug/ (see
 * lib/servicesApi.ts) rather than a fixed local list. Swap the URL
 * (/service/ac, /service/refrigerator, ...) — or add a brand-new service
 * from Django Admin and visit its own slug — and every field below (image,
 * name, description, included services, price) comes from that service's
 * own database row, with no frontend change.
 *
 * Route param stays `serviceId` (matching the service's slug) rather than
 * being renamed — that's the identifier every other part of this project
 * already keys services by (App.tsx's route, BookingCTA's /booking/:id
 * link, BookingPage).
 */
export function ServiceDetailPage() {
  const { serviceId } = useParams<{ serviceId: string }>()

  const [state, setState] = useState<LoadState>('loading')
  const [service, setService] = useState<Service | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!serviceId) {
      setState('not-found')
      return
    }

    let cancelled = false
    setState('loading')

    getServiceDetail(serviceId)
      .then((data) => {
        if (cancelled) return
        setService(data)
        setState('ready')
      })
      .catch((error) => {
        if (cancelled) return
        setState(error instanceof ServicesApiError && error.status === 404 ? 'not-found' : 'error')
      })

    return () => {
      cancelled = true
    }
  }, [serviceId, reloadToken])

  usePageMeta(
    service ? `${service.ariaLabel} | Urban Cool` : 'Service Not Found | Urban Cool',
    service
      ? `${service.shortDescription} Estimated cost ₹${service.startingPrice} - ₹${service.estimatedPriceTo}. Book ${service.name.toLowerCase()} with Urban Cool.`
      : "The service you're looking for could not be found on Urban Cool.",
  )

  if (state === 'loading') {
    return <ServiceDetailPageSkeleton />
  }

  if (state === 'error') {
    return (
      <section className="service-detail service-detail--not-found">
        <div className="container">
          <ServiceNotFound
            heading="Something Went Wrong"
            description="We couldn't load this service right now. Please check your connection and try again."
            onRetry={() => setReloadToken((n) => n + 1)}
          />
        </div>
      </section>
    )
  }

  if (state === 'not-found' || !service) {
    return (
      <section className="service-detail service-detail--not-found">
        <div className="container">
          <ServiceNotFound />
        </div>
      </section>
    )
  }

  return (
    <article className="service-detail" aria-labelledby="service-detail-heading">
      <div className="container">
        <ServiceDetailTopBar />

        <div className="service-detail__grid">
          <div className="service-detail__media">
            <ServiceHero service={service} />
            <IncludedServices items={service.includedServices} />
          </div>

          <div className="service-detail__content">
            <p className="service-detail__eyebrow">Service Details</p>
            <p className="service-detail__description">{service.detailIntro}</p>

            <TechnicianTrust />
            <EstimatedPrice
              startingPrice={service.startingPrice}
              endingPrice={service.estimatedPriceTo}
              priceLabel={service.priceLabel}
            />
            <BookingCTA serviceId={service.id} ariaLabel={service.ctaLabel} />
          </div>
        </div>
      </div>
    </article>
  )
}
