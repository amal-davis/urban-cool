import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { MapPinIcon, PencilIcon, PlusIcon, TrashIcon } from '../../icons/Icons'
import { Modal } from '../../Modal/Modal'
import { Skeleton } from '../../Skeleton/Skeleton'
import { isValidPincode } from '../../../lib/validation'
import { CustomerApiError } from '../../../lib/customerApi'
import type { AddressInput, CustomerAddress } from '../../../lib/customerApi'
import './AddressSection.css'
import './SectionCard.css'

interface AddressSectionProps {
  /** null = no address saved yet (backend returned 404 — see
   *  UserDashboard.tsx). undefined would also mean "haven't checked yet",
   *  but `loading` below already covers that distinctly. */
  address: CustomerAddress | null
  loading: boolean
  onAdd: (values: AddressInput) => Promise<void>
  onUpdate: (values: AddressInput) => Promise<void>
  onDelete: () => Promise<void>
}

const blankForm: AddressInput = { addressLine: '', city: '', state: '', pincode: '' }

function messageFor(error: unknown, fallback: string): string {
  return error instanceof CustomerApiError ? error.message : fallback
}

/** My Address — a single saved address (add/edit/delete), matching what
 *  the backend's Address model actually stores (accounts/models.py):
 *  address_line/city/state/pincode. No label/multiple-addresses/default
 *  badge like the old frontend-only mock had — this app has exactly one
 *  address per customer. */
export function AddressSection({ address, loading, onAdd, onUpdate, onDelete }: AddressSectionProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function openForm() {
    setFormOpen(true)
  }

  async function handleDelete() {
    setDeleteError(null)
    setDeleting(true)
    try {
      await onDelete()
      setConfirmingDelete(false)
    } catch (error) {
      setDeleteError(messageFor(error, 'Could not remove your address. Please try again.'))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="section-card" role="status" aria-busy="true">
        <span className="visually-hidden">Loading address…</span>
        <div className="address-skeleton">
          <Skeleton className="address-skeleton__line" />
          <Skeleton className="address-skeleton__line address-skeleton__line--short" />
        </div>
      </div>
    )
  }

  return (
    <>
      {address === null ? (
        <div className="section-card">
          <div className="section-empty">
            <MapPinIcon />
            <p className="section-text">No address added yet.</p>
            <button type="button" className="btn btn--primary" onClick={openForm}>
              <PlusIcon /> Add Address
            </button>
          </div>
        </div>
      ) : (
        <div className="section-card address-card">
          <p className="address-card__lines">
            {address.addressLine}
            <br />
            {address.city}, {address.state} - {address.pincode}
          </p>

          {deleteError && (
            <p className="address-form__notice address-form__notice--error" role="alert">
              {deleteError}
            </p>
          )}

          {confirmingDelete ? (
            <div className="address-card__confirm">
              <span>Delete this address?</span>
              <div className="address-card__confirm-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn--accent" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          ) : (
            <div className="address-card__actions">
              <button type="button" className="btn btn--ghost" onClick={openForm}>
                <PencilIcon /> Edit
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmingDelete(true)}>
                <TrashIcon /> Delete
              </button>
            </div>
          )}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={address ? 'Edit Address' : 'Add Address'}>
        <AddressFormFields
          initialValues={
            address
              ? { addressLine: address.addressLine, city: address.city, state: address.state, pincode: address.pincode }
              : blankForm
          }
          isEdit={address !== null}
          onSave={address ? onUpdate : onAdd}
          onCancel={() => setFormOpen(false)}
          onSaved={() => setFormOpen(false)}
        />
      </Modal>
    </>
  )
}

interface AddressFormFieldsProps {
  initialValues: AddressInput
  isEdit: boolean
  onSave: (values: AddressInput) => Promise<void>
  onCancel: () => void
  onSaved: () => void
}

function AddressFormFields({ initialValues, isEdit, onSave, onCancel, onSaved }: AddressFormFieldsProps) {
  const [values, setValues] = useState<AddressInput>(initialValues)
  const [touched, setTouched] = useState<Partial<Record<keyof AddressInput, boolean>>>({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const addressLineRef = useRef<HTMLInputElement>(null)
  const cityRef = useRef<HTMLInputElement>(null)
  const stateRef = useRef<HTMLInputElement>(null)
  const pincodeRef = useRef<HTMLInputElement>(null)

  function set<K extends keyof AddressInput>(key: K, value: AddressInput[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const errors = {
    addressLine: !values.addressLine.trim() ? 'Enter your address.' : null,
    city: !values.city.trim() ? 'Enter your city.' : null,
    state: !values.state.trim() ? 'Enter your state.' : null,
    pincode: !isValidPincode(values.pincode) ? 'Enter a valid 6-digit PIN code.' : null,
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched({ addressLine: true, city: true, state: true, pincode: true })

    if (errors.addressLine) return addressLineRef.current?.focus()
    if (errors.city) return cityRef.current?.focus()
    if (errors.state) return stateRef.current?.focus()
    if (errors.pincode) return pincodeRef.current?.focus()

    setApiError(null)
    setSaving(true)
    try {
      await onSave({
        addressLine: values.addressLine.trim(),
        city: values.city.trim(),
        state: values.state.trim(),
        pincode: values.pincode.trim(),
      })
      onSaved()
    } catch (error) {
      setApiError(messageFor(error, `Could not ${isEdit ? 'update' : 'save'} your address. Please try again.`))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="address-form" onSubmit={handleSubmit} noValidate>
      <div className={`form-field${touched.addressLine && errors.addressLine ? ' has-error' : ''}`}>
        <label htmlFor="address-line">House / Street / Area</label>
        <input
          ref={addressLineRef}
          id="address-line"
          value={values.addressLine}
          onChange={(e) => set('addressLine', e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, addressLine: true }))}
        />
        {touched.addressLine && errors.addressLine && (
          <span className="form-field__error" role="alert">
            {errors.addressLine}
          </span>
        )}
      </div>

      <div className="address-form__row">
        <div className={`form-field${touched.city && errors.city ? ' has-error' : ''}`}>
          <label htmlFor="address-city">City</label>
          <input
            ref={cityRef}
            id="address-city"
            value={values.city}
            onChange={(e) => set('city', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, city: true }))}
          />
          {touched.city && errors.city && (
            <span className="form-field__error" role="alert">
              {errors.city}
            </span>
          )}
        </div>
        <div className={`form-field${touched.state && errors.state ? ' has-error' : ''}`}>
          <label htmlFor="address-state">State</label>
          <input
            ref={stateRef}
            id="address-state"
            value={values.state}
            onChange={(e) => set('state', e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, state: true }))}
          />
          {touched.state && errors.state && (
            <span className="form-field__error" role="alert">
              {errors.state}
            </span>
          )}
        </div>
      </div>

      <div className={`form-field${touched.pincode && errors.pincode ? ' has-error' : ''}`}>
        <label htmlFor="address-pincode">PIN Code</label>
        <input
          ref={pincodeRef}
          id="address-pincode"
          inputMode="numeric"
          maxLength={6}
          value={values.pincode}
          onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
          onBlur={() => setTouched((t) => ({ ...t, pincode: true }))}
        />
        {touched.pincode && errors.pincode && (
          <span className="form-field__error" role="alert">
            {errors.pincode}
          </span>
        )}
      </div>

      {apiError && (
        <p className="address-form__notice address-form__notice--error" role="alert">
          {apiError}
        </p>
      )}

      <div className="address-form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Address'}
        </button>
      </div>
    </form>
  )
}
