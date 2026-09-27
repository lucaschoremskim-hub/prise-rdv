// Dates au format local 'AAAA-MM-JJ' (jamais d'UTC : un créneau à 9h reste à 9h).
export function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDaysISO(iso, n) {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export const todayISO = () => toISO(new Date())

// Minutes depuis minuit <-> 'HH:MM'
export const minToHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
export const hhmmToMin = (s) => {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}

// ---------- Affichage localisé (français / anglais) ----------
const LOCALE = { fr: 'fr-FR', en: 'en-GB' }
const localeOf = (lang) => LOCALE[lang] || LOCALE.fr
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// 2023-01-01 était un dimanche : sert de référence pour nommer un jour de semaine (0 = dimanche).
const weekdayRef = (dow) => new Date(2023, 0, 1 + dow)

export const weekdayLong = (dow, lang = 'fr') => capitalize(new Intl.DateTimeFormat(localeOf(lang), { weekday: 'long' }).format(weekdayRef(dow)))
export const weekdayShort = (dow, lang = 'fr') => new Intl.DateTimeFormat(localeOf(lang), { weekday: 'short' }).format(weekdayRef(dow))

export const dayNameLong = (iso, lang = 'fr') => weekdayLong(fromISO(iso).getDay(), lang)
export const dayNameShort = (iso, lang = 'fr') => weekdayShort(fromISO(iso).getDay(), lang)
export const monthNameShort = (iso, lang = 'fr') => new Intl.DateTimeFormat(localeOf(lang), { month: 'short' }).format(fromISO(iso))

// Heure affichée : 9h00 (fr) ou 9:00 (en)
export const minToLabel = (m, lang = 'fr') => {
  const h = Math.floor(m / 60)
  const mm = String(m % 60).padStart(2, '0')
  return lang === 'en' ? `${h}:${mm}` : `${h}h${mm}`
}

export function formatLongDate(iso, lang = 'fr') {
  const d = fromISO(iso)
  const month = new Intl.DateTimeFormat(localeOf(lang), { month: 'long' }).format(d)
  return `${dayNameLong(iso, lang)} ${d.getDate()} ${month} ${d.getFullYear()}`
}

export function formatShortDate(iso, lang = 'fr') {
  const d = fromISO(iso)
  return `${dayNameShort(iso, lang)} ${d.getDate()} ${monthNameShort(iso, lang)}`
}

export function formatDuration(min, lang = 'fr') {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  if (lang === 'en') return m ? `${h}h ${String(m).padStart(2, '0')}min` : `${h}h`
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

export const formatPrice = (p, lang = 'fr') =>
  Number(p).toLocaleString(lang === 'en' ? 'en-IE' : 'fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(Number(p)) ? 0 : 2 })

// Lundi de la semaine contenant iso
export function mondayOf(iso) {
  const d = fromISO(iso)
  const shift = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - shift)
  return toISO(d)
}
