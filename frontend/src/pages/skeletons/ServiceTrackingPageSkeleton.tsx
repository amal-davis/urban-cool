import { Skeleton, SkeletonPage } from '../../components/Skeleton/Skeleton'
import './PageSkeletons.css'

export function ServiceTrackingPageSkeleton() {
  return (
    <SkeletonPage label="service tracking page">
      <section className="skeleton-section">
        <div className="container">
          <Skeleton className="skeleton-heading" />

          <div className="skeleton-service-detail" style={{ marginTop: '1rem' }}>
            <div className="skeleton-service-detail__content">
              <Skeleton className="skeleton-field" />
              <Skeleton className="skeleton-field" style={{ height: '80px' }} />
              <Skeleton className="skeleton-field" style={{ height: '80px' }} />
            </div>
            <Skeleton className="skeleton-service-detail__media" />
          </div>
        </div>
      </section>
    </SkeletonPage>
  )
}
