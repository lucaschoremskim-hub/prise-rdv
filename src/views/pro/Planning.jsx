import { useState } from 'react'
import { Avatar, Confirm, Empty, Icon } from '../../components/ui'
import { useLang } from '../../lib/i18n.jsx'
import { addDaysISO, fromISO, mondayOf, todayISO, weekdayLong } from '../../lib/time'

const byTime = (a, b) => a.date.localeCompare(b.date) || a.start - b.start

export default function Planning({ state, cancelBooking, notify, goTab }) {
  const { lang, s, fmt } = useLang()
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
  const cancelledCount = shown.length - active.length

  const step = mode === 'day' ? 1 : 7
  const label = mode === 'day' ? (date === today ? s.planning.todayLabel(fmt.shortDate(date)) : fmt.longDate(date)) : s.planning.weekLabel(fmt.shortDate(weekDays[0]), fmt.shortDate(weekDays[6]))

  const setupDone = services.length > 0 && staff.length > 0 && staff.some((sv) => sv.serviceIds.length)

  return (
    <>
      {!setupDone && (
        <div className="setup">
          <h2 className="section-title">{s.planning.setupTitle}</h2>
          <ol>
            <li className={services.length ? 'ok' : ''}>
              <button onClick={() => goTab('services')}>
                <Icon name={services.length ? 'check' : 'scissors'} size={16} /> {s.planning.step1}
              </button>
            </li>
            <li className={staff.some((sv) => sv.serviceIds.length) ? 'ok' : ''}>
              <button onClick={() => goTab('team')}>
                <Icon name={staff.some((sv) => sv.serviceIds.length) ? 'check' : 'users'} size={16} /> {s.planning.step2}
              </button>
            </li>
            <li>
              <button onClick={() => goTab('hours')}>
                <Icon name="clock" size={16} /> {s.planning.step3}
              </button>
            </li>
          </ol>
        </div>
      )}

      <div className="segmented" role="tablist">
        {[
          ['day', s.planning.day],
          ['week', s.planning.week],
        ].map(([id, l]) => (
          <button key={id} role="tab" aria-selected={mode === id} className={mode === id ? 'active' : ''} onClick={() => setMode(id)}>
            {l}
          </button>
        ))}
      </div>

      <div className="date-nav">
        <button className="icon-btn" onClick={() => setDate(addDaysISO(date, -step))} aria-label={s.planning.prevAria}>
          <Icon name="left" />
        </button>
        <div className="date-nav-label">
          <strong>{label}</strong>
          {(mode === 'day' ? date !== today : weekStart !== mondayOf(today)) && (
            <button className="btn-link" onClick={() => setDate(today)}>
              {s.planning.backToday}
            </button>
          )}
        </div>
        <button className="icon-btn" onClick={() => setDate(addDaysISO(date, step))} aria-label={s.planning.nextAria}>
          <Icon name="chevron" />
        </button>
      </div>

      {staff.length > 1 && (
        <div className="chips">
          <button className={who === 'all' ? 'active' : ''} onClick={() => setWho('all')}>
            {s.planning.all}
          </button>
          {staff.map((sv) => (
            <button key={sv.id} className={who === sv.id ? 'active' : ''} onClick={() => setWho(sv.id)}>
              {sv.name}
            </button>
          ))}
        </div>
      )}

      <div className="stats">
        <div>
          <strong>{active.length}</strong>
          <span>{s.planning.statAppts}</span>
        </div>
        <div>
          <strong>{fmt.price(revenue)}</strong>
          <span>{s.planning.statRevenue}</span>
        </div>
        <div>
          <strong>{cancelledCount}</strong>
          <span>{cancelledCount > 1 ? s.planning.statCancelledPlural : s.planning.statCancelled}</span>
        </div>
      </div>

      {mode === 'day' ? (
        <DayList list={shown} closed={!settings.hours[fromISO(date).getDay()]?.open} onCancel={setToCancel} />
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
                    <strong>{weekdayLong(fromISO(d).getDay(), lang)}</strong> <span className="muted">{fmt.shortDate(d).split(' ').slice(1).join(' ')}</span>
                  </span>
                  <span className="muted small">{open ? s.planning.rdvCount(count) : s.planning.closed}</span>
                  <Icon name="chevron" size={16} />
                </button>
                {list.map((b) => (
                  <div key={b.id} className={`week-row${b.status === 'cancelled' ? ' is-cancelled' : ''}`}>
                    <span className="time">{fmt.time(b.start)}</span>
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
          title={s.planning.cancelDialog.title}
          text={s.planning.cancelDialog.text(toCancel.name, toCancel.serviceName, fmt.time(toCancel.start), toCancel.phone)}
          confirmLabel={s.planning.cancelDialog.confirm}
          danger
          onCancel={() => setToCancel(null)}
          onConfirm={() => {
            cancelBooking(toCancel.id, 'pro')
            setToCancel(null)
            notify(s.planning.notifyCancelled)
          }}
        />
      )}
    </>
  )
}

function DayList({ list, closed, onCancel }) {
  const { s, fmt } = useLang()
  if (!list.length) return <Empty icon="calendar" title={closed ? s.planning.dayEmpty.closed : s.planning.dayEmpty.none} text={closed ? null : s.planning.dayEmpty.text} />
  return (
    <div className="timeline">
      {list.map((b) => (
        <article key={b.id} className={`appt${b.status === 'cancelled' ? ' is-cancelled' : ''}`}>
          <div className="appt-time">
            <strong>{fmt.time(b.start)}</strong>
            <span>{fmt.time(b.end)}</span>
          </div>
          <div className="appt-body">
            <div className="appt-top">
              <strong>{b.name}</strong>
              {b.status === 'cancelled' ? <span className="badge badge-cancel">{s.planning.cancelledBy(b.cancelledBy === 'pro')}</span> : <span className="price">{fmt.price(b.price)}</span>}
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
                {s.planning.cancelBtn}
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
