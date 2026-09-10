import type { ReactNode } from 'react'
import { useScrollReveal } from './useScrollReveal'
import './Reveal.css'

interface RevealProps {
  children: ReactNode
}

/**
 * Wraps a page section in a plain div (not a ref forwarded onto the section
 * component itself — none of the section components use forwardRef, and
 * retrofitting every one of them just for this would be a much bigger,
 * riskier change than the effect is worth) that fades/rises into view on
 * scroll. See useScrollReveal.ts for why this never hides content that a
 * user without JS or motion would otherwise see.
 */
export function Reveal({ children }: RevealProps) {
  const { ref, revealState } = useScrollReveal<HTMLDivElement>()
  return (
    <div ref={ref} className={`reveal reveal--${revealState}`}>
      {children}
    </div>
  )
}
