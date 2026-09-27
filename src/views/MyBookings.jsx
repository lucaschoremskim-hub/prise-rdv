import { useState } from 'react'
import { Confirm, Empty, Icon } from '../components/ui'
import BookingSummary from '../components/BookingSummary'
import { useLang } from '../lib/i18n.jsx'
import { salonTitle } from '../lib/store'
import { downloadICS } from '../lib/ics'
import { todayISO } from '../lib/time'

const isPast = (b) => {
  const now = new Date()
  const today = todayISO()
  return b.date < today || (b.date === today && b.end <= now.getHours() * 60 + now.getMinutes())
}

// Rendez-vous pris depuis cet appareil.
export default function MyBookings({ state, cancelBooking, notify }) {
  const { lang, s } = useLang()
  const [toCancel, setToCancel] = useState(null)
  const mine = state.bookings
    .filter((b) => state.myBookingIds.includes(b.id))
    .sort((a, b) => (a.date + String(a.start).padStart(4, '0')).localeCompare(b.date + String(b.start).padStart(4, '0')))
  const upcoming = mine.filter((b) => !isPast(b))
  const past = mine.filter(isPast).reverse()

  return (
    <section className="step-anim">
      <h1 className="page-title">{s.myBookings.title}</h1>
      {!mine.length && (
        <Empty icon="calendar" title={s.myBookings.empty.title} text={s.myBookings.empty.text}>
          <a className="btn btn-gold" href="#/">
            {s.myBookings.bookNow}
          </a>
        </Empty>
      )}
      {upcoming.length > 0 && <h2 className="section-title">{s.myBookings.upcoming}</h2>}
      <div className="list">
        {upcoming.map((b) => (
          <div key={b.id} className={`my-booking${b.status === 'cancelled' ? ' is-cancelled' : ''}`}>
            {b.status === 'cancelled' && <span className="badge badge-cancel">{s.myBookings.cancelledLabel(b.cancelledBy === 'pro')}</span>}
            <BookingSummary {...b} />
            {b.status === 'confirmed' && (
              <div className="row-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => downloadICS(b, salonTitle(state.settings, lang), lang)}>
                  <Icon name="download" size={15} /> {s.myBookings.calendar}
                </button>
                <button className="btn btn-ghost btn-sm danger" onClick={() => setToCancel(b)}>
                  <Icon name="x" size={15} /> {s.myBookings.cancel}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {past.length > 0 && (
        <>
          <h2 className="section-title">{s.myBookings.past}</h2>
          <div className="list">
            {past.map((b) => (
              <div key={b.id} className="my-booking is-past">
                <BookingSummary {...b} />
              </div>
            ))}
          </div>
        </>
      )}
      {toCancel && (
        <Confirm
          title={s.booking.cancelDialog.title}
          text={s.booking.cancelDialog.text}
          confirmLabel={s.booking.cancelDialog.confirm}
          danger
          onCancel={() => setToCancel(null)}
          onConfirm={() => {
            cancelBooking(toCancel.id, 'client')
            setToCancel(null)
            notify(s.booking.notifyCancelled)
          }}
        />
      )}
    </section>
  )
}
