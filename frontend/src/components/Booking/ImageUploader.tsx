import { useRef } from 'react'
import { CloseIcon, PlusIcon } from '../icons/Icons'
import type { BookingImageFile } from '../../data/booking'

interface ImageUploaderProps {
  images: BookingImageFile[]
  onChange: (images: BookingImageFile[]) => void
  /** Surfaces a rejection (wrong format / too large / too many) — the
   *  brief is explicit that this shouldn't be alert(), and this project
   *  has a real toast component (components/Toast/Toast.tsx) for exactly
   *  this kind of transient, non-blocking notice. */
  onError: (message: string) => void
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ACCEPTED_LABEL = 'JPG, PNG, WEBP'
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const MAX_FILES = 6

/** Multiple-image upload with local-only previews (object URLs) — nothing
 *  here uploads anywhere; see data/booking.ts's BookingImageFile comment.
 *  Optional per the brief (never blocks Continue). */
export function ImageUploader({ images, onChange, onError }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // No unmount-revoke effect here on purpose: this component unmounts on
  // every step change (form -> review -> success), but `images` is owned by
  // BookingPage and stays alive across those steps — revoking here would
  // break every image's preview the moment the customer left the form step,
  // even though nothing was actually discarded. BookingPage.tsx owns the
  // "revoke everything outstanding" cleanup instead, scoped to when the
  // whole booking page itself unmounts. Only a genuine removal (below)
  // revokes here.

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return

    const incoming = Array.from(fileList)
    const accepted: BookingImageFile[] = []
    let rejectionMessage: string | null = null

    for (const file of incoming) {
      if (images.length + accepted.length >= MAX_FILES) {
        rejectionMessage = `You can upload up to ${MAX_FILES} images.`
        break
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        rejectionMessage = `${file.name} isn't a supported format. Use ${ACCEPTED_LABEL}.`
        continue
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejectionMessage = `${file.name} is larger than 5 MB.`
        continue
      }
      accepted.push({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })
    }

    if (accepted.length > 0) onChange([...images, ...accepted])
    if (rejectionMessage) onError(rejectionMessage)
    // Reset so selecting the exact same file again still fires onChange.
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleRemove(id: string) {
    const target = images.find((image) => image.id === id)
    if (target) URL.revokeObjectURL(target.previewUrl)
    onChange(images.filter((image) => image.id !== id))
  }

  return (
    <div className="booking-section">
      <h2 className="booking-section__heading">Related Images</h2>
      <p className="booking-section__hint">
        Upload photos of the appliance or issue to help our technician understand the problem.
      </p>

      <label className="image-uploader__dropzone" htmlFor="booking-images">
        <PlusIcon aria-hidden="true" />
        <span className="image-uploader__dropzone-label">Upload Images</span>
        <span className="image-uploader__dropzone-hint">{ACCEPTED_LABEL} — up to 5 MB each</span>
      </label>
      <input
        ref={inputRef}
        id="booking-images"
        name="images"
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        multiple
        className="visually-hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {images.length > 0 && (
        <ul className="image-uploader__previews">
          {images.map((image) => (
            <li key={image.id} className="image-uploader__preview">
              <img src={image.previewUrl} alt="" />
              <button
                type="button"
                className="image-uploader__remove"
                aria-label={`Remove ${image.file.name}`}
                onClick={() => handleRemove(image.id)}
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
