import { useEffect, useState } from 'react'
import { Icon, LanguageSwitch } from '../components/ui'
import { useLang } from '../lib/i18n.jsx'
import { DEFAULT_SETTINGS, salonTitle } from '../lib/store'
import Planning from './pro/Planning'
import Services from './pro/Services'
import Team from './pro/Team'
import Hours from './pro/Hours'
import Settings from './pro/Settings'

const TAB_IDS = [
  { id: 'planning', icon: 'calendar' },
  { id: 'services', icon: 'scissors' },
  { id: 'team', icon: 'users' },
  { id: 'hours', icon: 'clock' },
  { id: 'settings', icon: 'settings' },
]

const SESSION_KEY = 'prise-rdv-pro'
const readUnlocked = () => {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export default function Pro({ state, setState, cancelBooking, notify }) {
  const { lang, setLang, s } = useLang()
  const [unlocked, setUnlocked] = useState(readUnlocked)
  const [tab, setTab] = useState('planning')

  const unlock = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      // navigation privée : il faudra retaper le code
    }
    setUnlocked(true)
  }
  const lock = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY)
    } catch {
      // rien à faire
    }
    window.location.hash = '#/'
  }

  if (!unlocked) return <PinScreen pin={state.settings.pin} title={salonTitle(state.settings, lang)} onSuccess={unlock} lang={lang} setLang={setLang} />

  const props = { state, setState, notify, goTab: setTab }
  return (
    <div className="pro">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="store" size={16} />
          </span>
          <span>
            <span className="brand-name">{salonTitle(state.settings, lang)}</span>
            <small className="brand-sub">{s.pro.brandSub}</small>
          </span>
        </div>
        <nav className="topbar-links">
          <a href="#/" className="chip-link">
            <Icon name="user" size={15} />
            <span>{s.nav.clientView}</span>
          </a>
          <button className="chip-link" onClick={lock} aria-label={s.nav.lockAria}>
            <Icon name="lock" size={15} />
          </button>
          <LanguageSwitch lang={lang} setLang={setLang} />
        </nav>
      </header>

      <nav className="tabs" aria-label={s.pro.sectionsAria}>
        {TAB_IDS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)} aria-current={tab === t.id}>
            <Icon name={t.icon} size={20} />
            <span>{s.pro.tabs[t.id]}</span>
          </button>
        ))}
      </nav>

      <main className="container container-wide" key={tab}>
        <div className="step-anim">
          {tab === 'planning' && <Planning {...props} cancelBooking={cancelBooking} />}
          {tab === 'services' && <Services {...props} />}
          {tab === 'team' && <Team {...props} />}
          {tab === 'hours' && <Hours {...props} />}
          {tab === 'settings' && <Settings {...props} />}
        </div>
      </main>
    </div>
  )
}

function PinScreen({ pin, title, onSuccess, lang, setLang }) {
  const { s } = useLang()
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (value.length < 4) return
    if (value === pin) {
      onSuccess()
      return
    }
    setError(true)
    const t = setTimeout(() => {
      setValue('')
      setError(false)
    }, 600)
    return () => clearTimeout(t)
  }, [value, pin, onSuccess])

  const press = (d) => !error && setValue((v) => (v.length < 4 ? v + d : v))

  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) press(e.key)
      if (e.key === 'Backspace') setValue((v) => v.slice(0, -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="pin-screen step-anim">
      <a href="#/" className="icon-btn pin-back" aria-label={s.pin.backAria}>
        <Icon name="back" />
      </a>
      <div className="pin-lang">
        <LanguageSwitch lang={lang} setLang={setLang} />
      </div>
      <span className="brand-mark big">
        <Icon name="lock" size={24} />
      </span>
      <p className="eyebrow">{s.pin.eyebrow}</p>
      <h1 className="display small-display">{title}</h1>
      <div className={`pin-dots${error ? ' shake' : ''}`} aria-live="polite" aria-label={s.pin.enterAria(value.length)}>
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className={i < value.length ? 'on' : ''} />
        ))}
      </div>
      <p className={`pin-msg${error ? ' error' : ''}`}>{error ? s.pin.wrong : s.pin.enter}</p>
      <div className="pinpad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <span />
        <button onClick={() => press('0')}>0</button>
        <button onClick={() => setValue((v) => v.slice(0, -1))} aria-label={s.pin.eraseAria}>
          <Icon name="back" />
        </button>
      </div>
      {pin === DEFAULT_SETTINGS.pin && <p className="muted tiny">{s.pin.demo(DEFAULT_SETTINGS.pin)}</p>}
    </div>
  )
}
