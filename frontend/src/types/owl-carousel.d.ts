// Owl Carousel ships no TypeScript types and no @types package. It's a plain
// jQuery plugin (see HeroCarousel.tsx for why it's wired in imperatively).
// These declarations cover just the surface this project actually calls.

import 'jquery'

export interface OwlCarouselOptions {
  items?: number
  loop?: boolean
  autoplay?: boolean
  autoplayTimeout?: number
  autoplayHoverPause?: boolean
  smartSpeed?: number
  nav?: boolean
  navText?: [string, string]
  navElement?: string
  dots?: boolean
  responsive?: Record<number, { items: number }>
  [key: string]: unknown
}

declare global {
  interface JQuery {
    owlCarousel(options: OwlCarouselOptions): JQuery
    owlCarousel(method: string, ...args: unknown[]): JQuery
  }

  interface Window {
    jQuery: JQueryStatic
    $: JQueryStatic
  }
}

declare module 'owl.carousel/dist/owl.carousel.js' {}
