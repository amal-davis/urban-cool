import { Skeleton, SkeletonPage } from '../../components/Skeleton/Skeleton'
import './PageSkeletons.css'

export function BookingPageSkeleton() {
  return (
    <SkeletonPage label="booking page">
      <section className="skeleton-section">
        <div className="container">
          <Skeleton className="skeleton-icon-circle" />
          <Skeleton className="skeleton-heading" style={{ marginTop: '1rem' }} />
          <Skeleton className="skeleton-text" />

          <div className="skeleton-service-detail" style={{ marginTop: '1.5rem' }}>
            <div className="skeleton-service-detail__content">
              <Skeleton className="skeleton-field" />
              <Skeleton className="skeleton-field" />
              <Skeleton className="skeleton-field" />
              <Skeleton className="skeleton-field" />
              <Skeleton className="skeleton-button skeleton-button--block" />
            </div>
            <Skeleton className="skeleton-service-detail__media" />
          </div>
        </div>
      </section>
    </SkeletonPage>
  )
}
