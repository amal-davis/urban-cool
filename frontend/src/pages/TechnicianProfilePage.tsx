import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { TechnicianLayout } from '../components/TechnicianDashboard/TechnicianLayout'
import { TechSectionHeader } from '../components/TechnicianDashboard/TechSectionHeader'
import { Toast } from '../components/Toast/Toast'
import { CheckCircleIcon, PencilIcon } from '../components/icons/Icons'
import { INDIAN_STATES } from '../data/booking'
import { initialsFor } from '../lib/initials'
import { useTechnicianAuth } from '../lib/TechnicianAuthContext'
import { TechnicianAuthApiError, updateTechnicianProfile } from '../lib/technicianAuthApi'
import { usePageMeta } from '../lib/usePageMeta'
import './TechnicianProfilePage.css'

interface EditableAddress {
  addressLine: string
  city: string
  state: string
  pincode: string
  experienceYears: number
}

interface EditableFields {
  name: string
  email: string
  address: EditableAddress
  profileImageUrl: string | null
}

/**
 * Technician Profile — /technician/profile. Every field shown/edited here
 * (name/email/specialization/photo/address/experience) is real data from
 * TechnicianAuthContext, backed by GET/PATCH /api/technician/profile/ (see
 * backend/accounts/views.py's technician_profile and
 * TechnicianSelfSerializer). Mobile number is always read-only here — it's
 * the OTP login identity (backend/accounts/models.py's TechnicianProfile.
 * mobile_number), never editable from a plain profile form; changing it
 * would need its own OTP-gated flow, the same pattern the customer
 * dashboard's change-mobile flow already uses, which doesn't exist for
 * technicians yet.
 *
 * "Save Changes" PATCHes name/email/address/experience to the backend, then
 * mirrors the server's response into TechnicianAuthContext (so the header/
 * sidebar reflect the edit immediately, and so a rejected/adjusted value —
 * e.g. a trimmed name — shows the real saved state, not just what was
 * typed). The profile photo stays a local object-URL preview only —
 * profile_image is read-only on the backend serializer until a real upload
 * endpoint exists.
 */
export function TechnicianProfilePage() {
  const { technician, setTechnician } = useTechnicianAuth()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<EditableFields | null>(null)
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  usePageMeta('My Profile | Urban Cool Technician Portal', 'View and edit your technician profile.')

  if (!technician) return null

  function startEditing() {
    setDraft({
      name: technician!.name,
      email: technician!.email,
      address: {
        addressLine: technician!.addressLine,
        city: technician!.city,
        state: technician!.state,
        pincode: technician!.pincode,
        experienceYears: technician!.experienceYears,
      },
      profileImageUrl: technician!.profileImageUrl,
    })
    setEditing(true)
  }

  function cancelEditing() {
    setDraft(null)
    setEditing(false)
  }

  function handlePhotoChange(files: FileList | null) {
    const file = files?.[0]
    if (!file || !draft) return
    // Local preview only (object URL) — nothing is uploaded anywhere; see
    // this component's own header comment.
    setDraft({ ...draft, profileImageUrl: URL.createObjectURL(file) })
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft || saving) return

    setSaving(true)
    try {
      const updated = await updateTechnicianProfile({
        name: draft.name.trim() || technician!.name,
        email: draft.email.trim(),
        addressLine: draft.address.addressLine.trim(),
        city: draft.address.city.trim(),
        state: draft.address.state,
        pincode: draft.address.pincode.trim(),
        experienceYears: draft.address.experienceYears,
      })
      // The photo preview never went to the backend (see this component's
      // own header comment), so it isn't part of `updated` — carry it over
      // from the draft rather than letting a save wipe out the preview.
      setTechnician({ ...updated, profileImageUrl: draft.profileImageUrl })
      setEditing(false)
      setDraft(null)
      setToastMessage('Profile updated successfully.')
    } catch (error) {
      setToastMessage(error instanceof TechnicianAuthApiError ? error.message : 'Could not save your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const view =
    editing && draft
      ? draft
      : {
          name: technician.name,
          email: technician.email,
          address: {
            addressLine: technician.addressLine,
            city: technician.city,
            state: technician.state,
            pincode: technician.pincode,
            experienceYears: technician.experienceYears,
          },
          profileImageUrl: technician.profileImageUrl,
        }

  return (
    <TechnicianLayout>
      <section className="tech-section">
        <TechSectionHeader title="My Profile" />

        <form className="tech-profile-card" onSubmit={handleSave}>
          <div className="tech-profile-card__identity">
            <div className="tech-profile-card__avatar-wrap">
              {view.profileImageUrl ? (
                <img src={view.profileImageUrl} alt="" className="tech-profile-card__avatar-photo" />
              ) : (
                <span className="tech-profile-card__avatar-initials" aria-hidden="true">
                  {initialsFor(view.name)}
                </span>
              )}
              {editing && (
                <>
                  <button
                    type="button"
                    className="tech-profile-card__avatar-edit"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Change profile photo"
                  >
                    <PencilIcon />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="visually-hidden"
                    onChange={(event) => handlePhotoChange(event.target.files)}
                  />
                </>
              )}
            </div>

            {!editing && (
              <button type="button" className="btn btn--ghost" onClick={startEditing}>
                <PencilIcon /> Edit Profile
              </button>
            )}
          </div>

          <div className="tech-profile-card__fields">
            <div className="tech-profile-field">
              <label htmlFor="tech-profile-name">Name</label>
              {editing ? (
                <input
                  id="tech-profile-name"
                  type="text"
                  value={draft!.name}
                  onChange={(event) => setDraft({ ...draft!, name: event.target.value })}
                  required
                />
              ) : (
                <p>{view.name}</p>
              )}
            </div>

            <div className="tech-profile-field">
              <label htmlFor="tech-profile-mobile">
                Mobile Number
                <span className="tech-profile-field__lock" title="Used for OTP login — read-only">
                  <CheckCircleIcon /> Verified
                </span>
              </label>
              <p id="tech-profile-mobile" className="tech-profile-field__readonly">
                {technician.mobileNumber}
              </p>
            </div>

            <div className="tech-profile-field">
              <label htmlFor="tech-profile-email">Email</label>
              {editing ? (
                <input
                  id="tech-profile-email"
                  type="email"
                  value={draft!.email}
                  onChange={(event) => setDraft({ ...draft!, email: event.target.value })}
                  required
                />
              ) : (
                <p>{view.email}</p>
              )}
            </div>

            <div className="tech-profile-field">
              <label htmlFor="tech-profile-specialization">Service Specialization</label>
              <p id="tech-profile-specialization" className="tech-profile-field__specialization">
                {technician.specialization}
              </p>
            </div>

            <div className="tech-profile-field">
              <label htmlFor="tech-profile-experience">Experience</label>
              {editing ? (
                <input
                  id="tech-profile-experience"
                  type="number"
                  min={0}
                  max={60}
                  value={draft!.address.experienceYears}
                  onChange={(event) =>
                    setDraft({ ...draft!, address: { ...draft!.address, experienceYears: Number(event.target.value) } })
                  }
                />
              ) : (
                <p>{view.address.experienceYears} years</p>
              )}
            </div>

            <div className="tech-profile-field tech-profile-field--full">
              <label htmlFor="tech-profile-address">Address</label>
              {editing ? (
                <div className="tech-profile-address-grid">
                  <input
                    id="tech-profile-address"
                    type="text"
                    placeholder="Address line"
                    value={draft!.address.addressLine}
                    onChange={(event) => setDraft({ ...draft!, address: { ...draft!.address, addressLine: event.target.value } })}
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={draft!.address.city}
                    onChange={(event) => setDraft({ ...draft!, address: { ...draft!.address, city: event.target.value } })}
                  />
                  <select
                    value={draft!.address.state}
                    onChange={(event) => setDraft({ ...draft!, address: { ...draft!.address, state: event.target.value } })}
                  >
                    {INDIAN_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="PIN code"
                    maxLength={6}
                    value={draft!.address.pincode}
                    onChange={(event) => setDraft({ ...draft!, address: { ...draft!.address, pincode: event.target.value } })}
                  />
                </div>
              ) : (
                <p>
                  {view.address.addressLine}, {view.address.city}, {view.address.state} - {view.address.pincode}
                </p>
              )}
            </div>
          </div>

          {editing && (
            <div className="tech-profile-card__actions">
              <button type="button" className="btn btn--ghost" onClick={cancelEditing} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </section>

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </TechnicianLayout>
  )
}
