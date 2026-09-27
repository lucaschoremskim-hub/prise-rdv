import { Icon } from './ui'
import { useLang } from '../lib/i18n.jsx'

// Récapitulatif d'un rendez-vous (confirmation, mes rendez-vous, étape coordonnées).
export default function BookingSummary({ serviceName, staffName, date, start, end, price }) {
  const { fmt } = useLang()
  return (
    <div className="summary">
      <div className="summary-title">
        <span>{serviceName}</span>
        <strong>{fmt.price(price)}</strong>
      </div>
      <ul>
        <li>
          <Icon name="calendar" size={16} /> {fmt.longDate(date)}
        </li>
        <li>
          <Icon name="clock" size={16} /> {fmt.time(start)} – {fmt.time(end)} <span className="muted">· {fmt.duration(end - start)}</span>
        </li>
        <li>
          <Icon name="user" size={16} /> {staffName}
        </li>
      </ul>
    </div>
  )
}
