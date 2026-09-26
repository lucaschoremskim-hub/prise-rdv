import { Icon } from './ui'
import { formatDuration, formatLongDate, formatPrice, minToLabel } from '../lib/time'

// Récapitulatif d'un rendez-vous (confirmation, mes rendez-vous, étape coordonnées).
export default function BookingSummary({ serviceName, staffName, date, start, end, price }) {
  return (
    <div className="summary">
      <div className="summary-title">
        <span>{serviceName}</span>
        <strong>{formatPrice(price)}</strong>
      </div>
      <ul>
        <li>
          <Icon name="calendar" size={16} /> {formatLongDate(date)}
        </li>
        <li>
          <Icon name="clock" size={16} /> {minToLabel(start)} – {minToLabel(end)} <span className="muted">· {formatDuration(end - start)}</span>
        </li>
        <li>
          <Icon name="user" size={16} /> {staffName}
        </li>
      </ul>
    </div>
  )
}
