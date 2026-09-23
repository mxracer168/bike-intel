import type { LocationSummary } from '@/domain/location/list'
import { locationTypeLabels } from '@/domain/location/schema'
import { Tag } from '@/ui/Feedback'
import { countryName, timeZoneLabel } from './labels'
import styles from './Business.module.css'

export function LocationsView({ locations }: { locations: LocationSummary[] }) {
  return (
    <ul className={styles.locations}>
      {locations.map((l) => {
        const cityLine = [l.city, l.region, l.postalCode].filter(Boolean).join(', ')
        const roles = [l.sells && 'Sells', l.stocks && 'Holds stock', l.receives && 'Receives deliveries'].filter(Boolean) as string[]
        return (
          <li key={l.id} className={styles.location}>
            <div className={styles.locationHead}>
              <div>
                <p className={styles.locationName}>{l.name}</p>
                <p className={styles.locationType}>{locationTypeLabels[l.locationType]}</p>
              </div>
              {l.status === 'inactive' && <Tag>Inactive</Tag>}
            </div>
            <address className={styles.address}>
              {l.addressLine1 && <>{l.addressLine1}<br /></>}
              {l.addressLine2 && <>{l.addressLine2}<br /></>}
              {cityLine && <>{cityLine}<br /></>}
              {countryName(l.country)}
            </address>
            <p className={styles.small}>{timeZoneLabel(l.timezone)}</p>
            {roles.length > 0 && <div className={styles.roles}>{roles.map((r) => <Tag key={r}>{r}</Tag>)}</div>}
          </li>
        )
      })}
    </ul>
  )
}
