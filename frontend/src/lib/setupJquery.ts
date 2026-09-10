import $ from 'jquery'

/**
 * jquery is pinned to an EXACT version (3.7.1, see package.json — no `^`)
 * on purpose. Two version-sensitive issues bit this integration back to
 * back, and both would silently reappear on a routine `npm update`:
 *
 * 1. jQuery 4.x removes `$.camelCase`, which Owl Carousel 2.3.4's core
 *    `trigger()` method calls unconditionally on every event — so Owl
 *    throws immediately on init (`$.camelCase is not a function`), which
 *    then surfaces as cascading "Cannot read properties of null" errors
 *    elsewhere in Owl once construction has aborted partway through. Owl
 *    Carousel hasn't shipped a jQuery-4-compatible release (2.3.4, 2018, is
 *    still its latest), so the only fix is staying on a jQuery 3.x line.
 *
 * 2. Separately: jQuery's *ESM* build — `dist-module/jquery.module.js`,
 *    which is what a bundler resolves via the package's "module"/"import"
 *    export condition for `import $ from 'jquery'` when a version ships
 *    one — calls its internal factory as `jQueryFactory(window, true)`.
 *    That second argument is `noGlobal`, and passing `true` deliberately
 *    skips jQuery's own `window.jQuery = window.$ = jQuery` self-assignment
 *    (correct behavior for an ESM consumer, who's expected to use the
 *    imported binding — but Owl Carousel is a legacy plugin that only ever
 *    looks for the global). jQuery 3.7.1 has no such ESM build or export
 *    map at all, so this doesn't currently apply — but the explicit
 *    assignment below is kept as a harmless, version-agnostic safeguard in
 *    case a future jQuery release reintroduces it.
 *
 * The fix has to live in its own module rather than inline in
 * HeroCarousel.tsx. Static `import` declarations always finish evaluating
 * — fully — before the *importing* file's own top-level statements run, no
 * matter where in that file they're textually written. So this:
 *
 *   import $ from 'jquery'
 *   window.jQuery = $          // looks like it runs "in between"...
 *   import 'owl.carousel/...'  // ...but both imports evaluate first, in
 *                              // full, before this line ever runs.
 *
 * doesn't work — both imports resolve before either surrounding statement
 * in that file executes. Putting the assignment inside *this* module's own
 * body sidesteps that: it becomes part of evaluating this module, which
 * completes (assignment included) before whatever imports this next moves
 * on to its following sibling import.
 */
window.jQuery = window.$ = $

export default $
