import { useState } from 'react'
import { Avatar, Confirm, Empty, Icon } from '../../components/ui'
import { addDaysISO, DAY_NAMES, formatLongDate, formatPrice, formatShortDate, fromISO, minToLabel, mondayOf, todayISO } from '../../lib/time'

const byTime = (a, b) => a.date.localeCompare(b.date) || a.start - b.start

export default function Planning({ state, cancelBooking, notify, goTab }) {
  const { bookings, staff, services, settings } = state
  const [mode, setMode] = useState('day')
  const [date, setDate] = useState(todayISO())
  const [who, setWho] = useState('all')
  const [toCancel, setToCancel] = useState(null)

  const today = todayISO()
  const weekStart = mondayOf(date)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i))
  const inRange = (b) => (mode === 'day' ? b.date === date : b.date >= weekDays[0] && b.date <= weekDays[6])
  const shown = bookings.filter((b) => inRange(b) && (who === 'all' || b.staffId === who)).sort(byTime)
  const active = shown.filter((b) => b.status === 'confirmed')
  const revenue = active.reduce((sum, b) => sum + Number(b.price), 0)

  const step = mode === 'day' ? 1 : 7
  const label =
    mode === 'day'
      ? date === today
        ? `Aujourd’hui · ${formatShortDate(date)}`
        : formatLongDate(date)
      : `Semaine du ${formatShortDate(weekDays[0])} au ${formatShortDate(weekDays[6])}`

  const setupDone = services.length > 0 && staff.length > 0 && staff.some((s) => s.serviceIds.length)

  return (
    <>
      {!setupDone && (
        <div className="setup">
          <h2 className="section-title">Ouvrez vos réservations en 3 étapes</h2>
          <ol>
            <li className={services.length ? 'ok' : ''}>
              <button onClick={() => goTab('services')}>
                <Icon name={services.length ? 'check' : 'scissors'} size={16} /> Ajouter vos prestations
              </button>
            </li>
            <li className={staff.some((s) => s.serviceIds.length) ? 'ok' : ''}>
              <button onClick={() => goTab('team')}>
                <Icon name={staff.some((s) => s.serviceIds.length) ? 'check' : 'users'} size={16} /> Ajouter vos coiffeurs et leurs prestations
              </button>
            </li>
            <li>
              <button onClick={() => goTab('hours')}>
                <Icon name="clock" size={16} /> Vérifier vos horaires d’ouverture
              </button>
            </li>
          </ol>
        </div>
      )}

      <div className="segmented" role="tablist">
        {[
          ['day', 'Jour'],
          ['week', 'Semaine'],
        ].map(([id, l]) => (
          <button key={id} role="tab" aria-selected={mode === id} className={mode === id ? 'active' : ''} onClick={() => setMode(id)}>
            {l}
          </button>
        ))}
      </div>

      <div className="date-nav">
        <button className="icon-btn" onClick={() => setDate(addDaysISO(date, -step))} aria-label="Précédent">
          <Icon name="left" />
        </button>
        <div className="date-nav-label">
          <strong>{label}</strong>
          {(mode === 'day' ? date !== today : weekStart !== mondayOf(today)) && (
            <button className="btn-link" onClick={() => setDate(today)}>
              Revenir à aujourd’hui
            </button>
          )}
        </div>
        <button className="icon-btn" onClick={() => setDate(addDaysISO(date, step))} aria-label="Suivant">
          <Icon name="chevron" />
        </button>
      </div>

      {staff.length > 1 && (
        <div className="chips">
          <button className={who === 'all' ? 'active' : ''} onClick={() => setWho('all')}>
            Tous
          </button>
          {staff.map((s) => (
            <button key={s.id} className={who === s.id ? 'active' : ''} onClick={() => setWho(s.id)}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="stats">
        <div>
          <strong>{active.length}</strong>
          <span>rendez-vous</span>
        </div>
        <div>
          <strong>{formatPrice(revenue)}</strong>
          <span>chiffre prévu</span>
        </div>
        <div>
          <strong>{shown.length - active.length}</strong>
          <span>annulé{shown.length - active.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {mode === 'day' ? (
        <DayList
          list={shown}
          closed={!settings.hours[fromISO(date).getDay()]?.open}
          onCancel={setToCancel}
        />
      ) : (
        <div className="week">
          {weekDays.map((d) => {
            const list = shown.filter((b) => b.date === d)
            const open = settings.hours[fromISO(d).getDay()]?.open
            const count = list.filter((b) => b.status === 'confirmed').length
            return (
              <div key={d} className={`week-day${d === today ? ' is-today' : ''}`}>
                <button
                  className="week-head"
                  onClick={() => {
                    setDate(d)
                    setMode('day')
                  }}
                >
                  <span>
                    <strong>{DAY_NAMES[fromISO(d).getDay()]}</strong> <span className="muted">{formatShortDate(d).split(' ').slice(1).join(' ')}</span>
                  </span>
                  <span className="muted small">{open ? `${count} RDV` : 'Fermé'}</span>
                  <Icon name="chevron" size={16} />
                </button>
                {list.map((b) => (
                  <div key={b.id} className={`week-row${b.status === 'cancelled' ? ' is-cancelled' : ''}`}>
                    <span className="time">{minToLabel(b.start)}</span>
                    <span className="ellipsis">
                      {b.name} · <span className="muted">{b.serviceName}</span>
                    </span>
                    <span className="muted small">{b.staffName}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {toCancel && (
        <Confirm
          title="Annuler ce rendez-vous ?"
          text={`${toCancel.name} · ${toCancel.serviceName} à ${minToLabel(toCancel.start)}. Pensez à prévenir le client au ${toCancel.phone}.`}
          confirmLabel="Annuler le rendez-vous"
          danger
          onCancel={() => setToCancel(null)}
          onConfirm={() => {
            cancelBooking(toCancel.id, 'pro')
            setToCancel(null)
            notify('Rendez-vous annulé, créneau libéré')
          }}
        />
      )}
    </>
  )
}

function DayList({ list, closed, onCancel }) {
  if (!list.length)
    return <Empty icon="calendar" title={closed ? 'Salon fermé ce jour-là' : 'Aucun rendez-vous'} text={closed ? null : 'Les réservations de vos clients apparaîtront ici.'} />
  return (
    <div className="timeline">
      {list.map((b) => (
        <article key={b.id} className={`appt${b.status === 'cancelled' ? ' is-cancelled' : ''}`}>
          <div className="appt-time">
            <strong>{minToLabel(b.start)}</strong>
            <span>{minToLabel(b.end)}</span>
          </div>
          <div className="appt-body">
            <div className="appt-top">
              <strong>{b.name}</strong>
              {b.status === 'cancelled' ? (
                <span className="badge badge-cancel">Annulé par {b.cancelledBy === 'pro' ? 'le salon' : 'le client'}</span>
              ) : (
                <span className="price">{formatPrice(b.price)}</span>
              )}
            </div>
            <p className="muted small appt-service">
              {b.serviceName} · <Avatar name={b.staffName} /> {b.staffName}
            </p>
            <div className="appt-contact">
              <a href={`tel:${b.phone.replace(/\s/g, '')}`}>
                <Icon name="phone" size={14} /> {b.phone}
              </a>
              <a href={`mailto:${b.email}`}>
                <Icon name="mail" size={14} /> {b.email}
              </a>
            </div>
            {b.status === 'confirmed' && (
              <button className="btn btn-link danger small" onClick={() => onCancel(b)}>
                Annuler
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
