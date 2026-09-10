import { Skeleton, SkeletonPage } from '../../components/Skeleton/Skeleton'
import './PageSkeletons.css'

export function LoginPageSkeleton() {
  return (
    <SkeletonPage label="Urban Cool login page">
      <section className="skeleton-section">
        <div className="container skeleton-auth-wrap">
          <div className="skeleton-auth-card">
            <Skeleton className="skeleton-heading skeleton-heading--center" />
            <Skeleton className="skeleton-text skeleton-heading--center" />
            <Skeleton className="skeleton-field" />
            <Skeleton className="skeleton-button skeleton-button--block" />
          </div>
        </div>
      </section>
    </SkeletonPage>
  )
}
