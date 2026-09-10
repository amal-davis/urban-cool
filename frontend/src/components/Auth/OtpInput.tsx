import { useRef } from 'react'
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react'
import './OtpInput.css'

interface OtpInputProps {
  length: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  hasError?: boolean
}

/**
 * One box per digit. A single string (owned by the parent step) is the
 * source of truth rather than per-box local state, so paste/backspace/
 * autofill can update multiple boxes atomically without racing React's
 * batching.
 */
export function OtpInput({ length, value, onChange, disabled, hasError }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  function setDigit(index: number, digit: string) {
    const digits = value.padEnd(length, ' ').split('')
    digits[index] = digit
    onChange(digits.join('').trimEnd())
  }

  function focusIndex(index: number) {
    const target = inputRefs.current[index]
    target?.focus()
    target?.select()
  }

  function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const digitsOnly = event.target.value.replace(/\D/g, '')
    if (!digitsOnly) {
      setDigit(index, '')
      return
    }
    // Last typed character — covers both a fresh digit and the browser
    // replacing an already-filled, selected box's content.
    setDigit(index, digitsOnly[digitsOnly.length - 1])
    if (index < length - 1) focusIndex(index + 1)
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      if (value[index] && value[index] !== ' ') {
        setDigit(index, '')
        return
      }
      if (index > 0) {
        event.preventDefault()
        setDigit(index - 1, '')
        focusIndex(index - 1)
      }
      return
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusIndex(index - 1)
    }
    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault()
      focusIndex(index + 1)
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    event.preventDefault()
    onChange(pasted)
    focusIndex(Math.min(pasted.length, length - 1))
  }

  return (
    <div className={`otp-input${hasError ? ' has-error' : ''}`} role="group" aria-label="One-time password">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          pattern="\d*"
          maxLength={1}
          className="otp-input__box"
          value={value[index]?.trim() ?? ''}
          disabled={disabled}
          autoFocus={index === 0}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          aria-label={`Digit ${index + 1} of ${length}`}
        />
      ))}
    </div>
  )
}
