import { useEffect } from 'react'

/**
 * No metadata/head-management library exists in this project (checked
 * package.json) — react-router doesn't manage `<head>`, and adding a
 * dependency (react-helmet-async, etc.) for two static page titles isn't
 * worth it yet. Plain DOM writes on route mount are the simplest thing that
 * actually works for a client-rendered SPA.
 */
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title

    const meta = document.querySelector('meta[name="description"]')
    const previousDescription = meta?.getAttribute('content') ?? null
    meta?.setAttribute('content', description)

    return () => {
      if (meta && previousDescription !== null) {
        meta.setAttribute('content', previousDescription)
      }
    }
  }, [title, description])
}
