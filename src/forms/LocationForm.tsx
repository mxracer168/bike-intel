'use client'

import { useActionState, useState, useSyncExternalStore } from 'react'
import { locationTypeLabels, locationTypes } from '@/domain/location/schema'
import { supportedCountries, type CountryCode } from '@/domain/reference/countries'
import { commonTimeZones, isValidTimeZone } from '@/domain/reference/timezones'
import { addLocationAction } from '@/server/actions/onboarding'
import { initialFormState } from '@/server/forms'
import { Field, Select, TextInput, describedBy } from '@/ui/Field'
import { FormErrorSummary } from '@/ui/Feedback'
import { SubmitButton } from '@/ui/SubmitButton'
import styles from './forms.module.css'

const subscribe = () => () => {}
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
const serverTimeZone = () => ''

export function LocationForm({ defaultCountry }: { defaultCountry: CountryCode }) {
  const [state, action] = useActionState(addLocationAction, initialFormState)
  const e = state.errors
  const v = state.values
  const detected = useSyncExternalStore(subscribe, browserTimeZone, serverTimeZone)
  const [country, setCountry] = useState<CountryCode>((v.country as CountryCode) || defaultCountry)
  const [chosenZone, setChosenZone] = useState<string | null>(v.timezone || null)
  const zones = commonTimeZones[country]
  const detectedFits = isValidTimeZone(detected) && zones.some((z) => z.id === detected)
  const timezone = chosenZone ?? (detectedFits ? detected : '')

  return (
    <form action={action} className={styles.form} noValidate>
      <FormErrorSummary errors={state.formError ? [state.formError] : []} title={state.formError} />
      <div className={styles.row}>
        <Field id="name" label="Location name" help="For example, “Main Street” or “North warehouse”." error={e.name}>
          <TextInput id="name" name="name" required defaultValue={v.name} invalid={Boolean(e.name)}
            aria-describedby={describedBy('name', { help: true, error: e.name })} />
        </Field>
        <Field id="locationType" label="Type" error={e.locationType}>
          <Select id="locationType" name="locationType" defaultValue={v.locationType || 'store'} invalid={Boolean(e.locationType)}
            aria-describedby={describedBy('locationType', { error: e.locationType })}>
            {locationTypes.map((t) => <option key={t} value={t}>{locationTypeLabels[t]}</option>)}
          </Select>
        </Field>
      </div>
      <Field id="addressLine1" label="Street address" optional error={e.addressLine1}>
        <TextInput id="addressLine1" name="addressLine1" autoComplete="address-line1" defaultValue={v.addressLine1} />
      </Field>
      <Field id="addressLine2" label="Suite, unit or floor" optional error={e.addressLine2}>
        <TextInput id="addressLine2" name="addressLine2" autoComplete="address-line2" defaultValue={v.addressLine2} />
      </Field>
      <div className={styles.row3}>
        <Field id="city" label="City" optional error={e.city}>
          <TextInput id="city" name="city" autoComplete="address-level2" defaultValue={v.city} />
        </Field>
        <Field id="region" label={country === 'CA' ? 'Province' : 'State'} optional error={e.region}>
          <TextInput id="region" name="region" autoComplete="address-level1" defaultValue={v.region} />
        </Field>
        <Field id="postalCode" label={country === 'CA' ? 'Postal code' : 'ZIP code'} optional error={e.postalCode}>
          <TextInput id="postalCode" name="postalCode" autoComplete="postal-code" defaultValue={v.postalCode} />
        </Field>
      </div>
      <div className={styles.row}>
        <Field id="country" label="Country" error={e.country}>
          <Select id="country" name="country" value={country}
            onChange={(ev) => { setCountry(ev.target.value as CountryCode); setChosenZone(null) }}>
            {supportedCountries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
        </Field>
        <Field id="timezone" label="Time zone" help="Used to count each day’s sales at this location." error={e.timezone}>
          <Select id="timezone" name="timezone" value={timezone} onChange={(ev) => setChosenZone(ev.target.value)}
            invalid={Boolean(e.timezone)} aria-describedby={describedBy('timezone', { help: true, error: e.timezone })}>
            <option value="" disabled>Choose a time zone</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
          </Select>
        </Field>
      </div>
      <div className={styles.actions}>
        <SubmitButton pendingLabel="Saving…">Save location</SubmitButton>
      </div>
    </form>
  )
}
