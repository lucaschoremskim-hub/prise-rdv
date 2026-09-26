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
// Affichage : 9h00, 14h30
export const minToLabel = (m) => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`

export const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
export const DAY_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

export function formatLongDate(iso) {
  const d = fromISO(iso)
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function formatShortDate(iso) {
  const d = fromISO(iso)
  return `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

export const monthShort = (iso) => MONTHS_SHORT[fromISO(iso).getMonth()]

export function formatDuration(min) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

export const formatPrice = (p) =>
  Number(p).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(Number(p)) ? 0 : 2 })

// Lundi de la semaine contenant iso
export function mondayOf(iso) {
  const d = fromISO(iso)
  const shift = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - shift)
  return toISO(d)
}
