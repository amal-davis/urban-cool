import { Skeleton, SkeletonPage } from '../../components/Skeleton/Skeleton'
import './PageSkeletons.css'

export function ServicesPageSkeleton() {
  return (
    <SkeletonPage label="Urban Cool services">
      <section className="skeleton-section skeleton-section--tinted">
        <div className="container">
          <Skeleton className="skeleton-badge" />
          <Skeleton className="skeleton-heading" />
          <Skeleton className="skeleton-text" />
        </div>
      </section>

      <section className="skeleton-section">
        <div className="container skeleton-detail-list">
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
      </section>
    </SkeletonPage>
  )
}
