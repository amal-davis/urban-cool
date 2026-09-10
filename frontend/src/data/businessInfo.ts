/**
 * Real phone/email, provided directly by the business — every place that
 * shows contact info (ContactInfo, Footer) reads from this one file, so
 * updating it here updates the whole site. No verified street address
 * exists yet (checked PRODUCT.md, DESIGN.md, the Django backend, and the
 * rest of the repo), so that and the map query stay the earlier clearly
 * marked placeholder/city-level values until a real one is provided.
 *
 * `phoneHref`/`emailHref` stay `null` only while their display counterpart
 * is a placeholder — a `tel:`/`mailto:` link built from placeholder text
 * would just be broken, so the components render plain (non-clickable)
 * text instead in that case. Both are real now, so both link.
 */
export const businessInfo = {
  addressDisplay: '[Urban Cool Address — Kochi, Kerala]',

  phoneDisplay: '+91 79079 57490',
  /** e.g. 'tel:+914812345678' once a real number exists. */
  phoneHref: 'tel:+917907957490' as string | null,

  emailDisplay: 'urbancool07@gmail.com',
  /** e.g. 'mailto:hello@urbancool.example' once a real address exists. */
  emailHref: 'mailto:urbancool07@gmail.com' as string | null,

  serviceArea: 'Kochi, Kerala',

  /** City-level only — no exact business address to place a precise pin at
   *  yet. Update to the real street address once it's available; every
   *  place that embeds the map (MapEmbed) reads from this. */
  mapQuery: 'Kochi, Kerala',
}
