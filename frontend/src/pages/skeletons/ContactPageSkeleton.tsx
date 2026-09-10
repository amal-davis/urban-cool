import { Skeleton, SkeletonPage } from '../../components/Skeleton/Skeleton'
import './PageSkeletons.css'

export function ContactPageSkeleton() {
  return (
    <SkeletonPage label="Urban Cool contact page">
      <section className="skeleton-section skeleton-section--tinted">
        <div className="container">
          <Skeleton className="skeleton-badge" />
          <Skeleton className="skeleton-heading" />
          <Skeleton className="skeleton-text" />
        </div>
      </section>

      <section className="skeleton-section">
        <div className="container skeleton-contact-grid">
          <div className="skeleton-contact-card">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="skeleton-contact-row">
                <Skeleton className="skeleton-icon-circle" />
                <div className="skeleton-contact-row__lines">
                  <Skeleton className="skeleton-text skeleton-text--short" />
                  <Skeleton className="skeleton-text skeleton-text--short" />
                </div>
              </div>
            ))}
          </div>
          <div className="skeleton-contact-card">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="skeleton-field" />
            ))}
            <Skeleton className="skeleton-button" />
          </div>
        </div>
      </section>
    </SkeletonPage>
  )
}
