import { useCallback, useEffect, useState } from 'react'
import { salonTitle, useStore } from './lib/store'
import { useLang } from './lib/i18n.jsx'
import { Icon, LanguageSwitch, Toast } from './components/ui'
import Booking from './views/Booking'
import MyBookings from './views/MyBookings'
import Pro from './views/Pro'

// Navigation par ancre (#/pro, #/mes-rdv) : le bouton « retour » du téléphone fonctionne.
const readRoute = () => window.location.hash.replace(/^#\/?/, '') || 'reserver'

export default function App() {
  const [state, setState] = useStore()
  const { lang, setLang, s } = useLang()
  const [route, setRoute] = useState(readRoute)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    document.title = `${salonTitle(state.settings, lang)} ${s.common.titleSuffix}`
  }, [state.settings, lang, s])

  const notify = useCallback((msg) => {
    setToast(msg)
    clearTimeout(notify.t)
    notify.t = setTimeout(() => setToast(''), 2400)
  }, [])

  const addBooking = (booking) =>
    setState((s) => ({ ...s, bookings: [...s.bookings, booking], myBookingIds: [...s.myBookingIds, booking.id] }))

  const cancelBooking = (id, by) =>
    setState((s) => ({
      ...s,
      bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: 'cancelled', cancelledBy: by, cancelledAt: new Date().toISOString() } : b)),
    }))

  const title = salonTitle(state.settings, lang)

  if (route === 'pro') {
    return (
      <>
        <Pro state={state} setState={setState} cancelBooking={cancelBooking} notify={notify} />
        <Toast message={toast} />
      </>
    )
  }

  return (
    <div className="client">
      <header className="topbar">
        <a href="#/" className="brand">
          <span className="brand-mark">
            <Icon name="scissors" size={16} />
          </span>
          <span className="brand-name">{title}</span>
        </a>
        <nav className="topbar-links">
          <a href="#/mes-rdv" className={`chip-link${route === 'mes-rdv' ? ' active' : ''}`}>
            <Icon name="calendar" size={15} />
            <span>{s.nav.myBookings}</span>
          </a>
          <a href="#/pro" className="chip-link" aria-label={s.nav.proAria}>
            <Icon name="lock" size={15} />
            <span>{s.nav.pro}</span>
          </a>
          <LanguageSwitch lang={lang} setLang={setLang} />
        </nav>
      </header>
      <main className="container">
        {route === 'mes-rdv' ? (
          <MyBookings state={state} cancelBooking={cancelBooking} notify={notify} />
        ) : (
          <Booking state={state} addBooking={addBooking} cancelBooking={cancelBooking} notify={notify} />
        )}
      </main>
      <footer className="foot">{s.common.footer}</footer>
      <Toast message={toast} />
    </div>
  )
}
