import { createContext, useContext, useEffect, useState } from 'react'
import { STRINGS } from './strings'
import { dayNameShort, formatDuration, formatLongDate, formatPrice, formatShortDate, minToLabel, monthNameShort } from './time'

const KEY = 'prise-rdv-lang'

// Anglais si le navigateur du visiteur est configuré en anglais, français sinon.
function detectLang() {
  try {
    const nav = (navigator.language || navigator.languages?.[0] || '').toLowerCase()
    return nav.startsWith('en') ? 'en' : 'fr'
  } catch {
    return 'fr'
  }
}

function loadLang() {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'fr' || v === 'en') return v
  } catch {
    // stockage indisponible : on retombe sur la détection du navigateur
  }
  return detectLang()
}

const LangContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(loadLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = (l) => {
    setLangState(l)
    try {
      localStorage.setItem(KEY, l)
    } catch {
      // navigation privée : le choix ne survivra pas à la fermeture de l'onglet
    }
  }

  const s = STRINGS[lang]
  const fmt = {
    price: (p) => formatPrice(p, lang),
    duration: (m) => formatDuration(m, lang),
    longDate: (iso) => formatLongDate(iso, lang),
    shortDate: (iso) => formatShortDate(iso, lang),
    time: (m) => minToLabel(m, lang),
    dayShort: (iso) => dayNameShort(iso, lang),
    monthShort: (iso) => monthNameShort(iso, lang),
  }

  return <LangContext.Provider value={{ lang, setLang, s, fmt }}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang doit être utilisé sous <LanguageProvider>')
  return ctx
}
