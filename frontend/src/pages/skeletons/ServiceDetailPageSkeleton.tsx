import { Skeleton, SkeletonPage } from '../../components/Skeleton/Skeleton'
import './PageSkeletons.css'

export function ServiceDetailPageSkeleton() {
  return (
    <SkeletonPage label="service details">
      <section className="skeleton-section">
        <div className="container">
          <div className="skeleton-service-topbar">
            <Skeleton className="skeleton-icon-circle" />
            <Skeleton className="skeleton-icon-circle" />
          </div>
          <div className="skeleton-service-detail">
            <Skeleton className="skeleton-service-detail__media" />
            <div className="skeleton-service-detail__content">
              <Skeleton className="skeleton-heading skeleton-heading--sm" />
              <Skeleton className="skeleton-text" />
              <Skeleton className="skeleton-text skeleton-text--short" />
              <Skeleton className="skeleton-heading skeleton-heading--sm" />
              <Skeleton className="skeleton-text" />
              <Skeleton className="skeleton-text skeleton-text--short" />
              <Skeleton className="skeleton-button" />
            </div>
          </div>
        </div>
      </section>
    </SkeletonPage>
  )
}
