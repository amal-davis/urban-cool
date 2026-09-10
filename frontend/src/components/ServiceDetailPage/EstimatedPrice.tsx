import { PRICE_DISCLAIMER } from '../../data/services'

interface EstimatedPriceProps {
  startingPrice: number
  /** Upper bound of the range — when set, renders "₹X – ₹Y" instead of a
   *  single "Starting From ₹X" figure (see data/services.ts's Service.
   *  estimatedPriceTo for which services actually carry this). */
  endingPrice?: number
  priceLabel?: string
}

/**
 * Estimated-price block. Deliberately never says "Price:" or shows a bare
 * number — a label ("Starting From"/"Estimated Cost") + the disclaimer
 * below it make it unambiguous this is an estimate, not a final quote (the
 * real cost is only ever confirmed by the booking/service flow). See
 * PRICE_DISCLAIMER in data/services.ts — shared wording, not re-typed per
 * service.
 */
export function EstimatedPrice({ startingPrice, endingPrice, priceLabel }: EstimatedPriceProps) {
  const hasRange = endingPrice != null
  const label = priceLabel ?? (hasRange ? 'Estimated Cost' : 'Starting From')
  const value = hasRange
    ? `₹${startingPrice.toLocaleString('en-IN')} – ₹${endingPrice.toLocaleString('en-IN')}`
    : `₹${startingPrice}`

  return (
    <div className="service-detail__price">
      <span className="service-detail__price-label">{label}</span>
      <span className="service-detail__price-value">{value}</span>
      <p className="service-detail__price-disclaimer">{PRICE_DISCLAIMER}</p>
    </div>
  )
}
