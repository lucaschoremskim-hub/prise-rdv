import { addDaysISO, fromISO, toISO } from './time.js'

// Délai minimum entre maintenant et le début d'un rendez-vous (choix du commerçant : 2 heures).
export const MIN_NOTICE_MIN = 120

const minutesOfDay = (date) => date.getHours() * 60 + date.getMinutes()

// Coiffeurs capables de réaliser la prestation.
export const eligibleStaff = (staff, serviceId) => staff.filter((s) => s.serviceIds.includes(serviceId))

// Un coiffeur est libre si aucun rendez-vous confirmé ne chevauche [start, end[ en tenant compte du battement.
export function isStaffFree(bookings, staffId, date, start, end, buffer = 0) {
  return !bookings.some(
    (b) =>
      b.status === 'confirmed' &&
      b.staffId === staffId &&
      b.date === date &&
      start < b.end + buffer &&
      b.start < end + buffer,
  )
}

// Heures de début candidates : on part de chaque ouverture et on avance de la durée de la prestation.
export function candidateStarts(dayHours, duration) {
  if (!dayHours?.open) return []
  const out = []
  for (const [open, close] of dayHours.ranges) {
    for (let t = open; t + duration <= close; t += duration) out.push(t)
  }
  return out
}

// Le jour est-il réservable (ouvert et dans l'horizon) ?
export function isDayBookable(settings, date, now = new Date()) {
  const today = toISO(now)
  if (date < today) return false
  if (date > addDaysISO(today, settings.horizonDays)) return false
  return !!settings.hours[fromISO(date).getDay()]?.open
}

/**
 * Créneaux d'un jour pour une prestation.
 * staffChoice : id d'un coiffeur, ou 'any' (peu importe).
 * Retourne [{ start, end, staffIds }] : staffIds = coiffeurs libres à cette heure.
 */
export function slotsForDay({ settings, staff, bookings }, service, staffChoice, date, now = new Date()) {
  if (!service || !isDayBookable(settings, date, now)) return []
  const pool = eligibleStaff(staff, service.id).filter((s) => staffChoice === 'any' || s.id === staffChoice)
  if (!pool.length) return []
  const today = toISO(now)
  const earliest = date === today ? minutesOfDay(now) + MIN_NOTICE_MIN : -1
  const dayHours = settings.hours[fromISO(date).getDay()]
  const buffer = settings.bufferMin || 0
  const out = []
  for (const start of candidateStarts(dayHours, service.duration)) {
    if (start < earliest) continue
    const end = start + service.duration
    const free = pool.filter((s) => isStaffFree(bookings, s.id, date, start, end, buffer)).map((s) => s.id)
    if (free.length) out.push({ start, end, staffIds: free })
  }
  return out
}

// Pour « peu importe » : on confie le rendez-vous au coiffeur le moins chargé ce jour-là.
export function pickStaff(staffIds, bookings, date) {
  const load = (id) => bookings.filter((b) => b.status === 'confirmed' && b.staffId === id && b.date === date).length
  return [...staffIds].sort((a, b) => load(a) - load(b))[0]
}
