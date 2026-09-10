import { Skeleton, SkeletonPage } from '../../components/Skeleton/Skeleton'
import './PageSkeletons.css'

export function DashboardPageSkeleton() {
  return (
    <SkeletonPage label="Urban Cool account dashboard">
      <section className="skeleton-section">
        <div className="container skeleton-dashboard">
          <div className="skeleton-dashboard__profile">
            <Skeleton className="skeleton-dashboard__avatar" />
            <Skeleton className="skeleton-heading skeleton-heading--center" />
            <Skeleton className="skeleton-text skeleton-text--short skeleton-heading--center" />
            <Skeleton className="skeleton-button" />
          </div>
          <div className="skeleton-dashboard__menu">
            {Array.from({ length: 7 }, (_, index) => (
              <Skeleton key={index} className="skeleton-dashboard__row" />
            ))}
          </div>
        </div>
      </section>
    </SkeletonPage>
  )
}
