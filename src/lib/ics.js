import { minToHHMM } from './time.js'

const stamp = (date, min) => `${date.replaceAll('-', '')}T${minToHHMM(min).replace(':', '')}00`
const esc = (s) => String(s).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n')

// Fichier agenda (.ics) reconnu par Google Agenda, Apple Calendrier et Outlook.
export function buildICS(booking, salonName) {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//prise-rdv//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.id}@prise-rdv`,
    `DTSTAMP:${now}`,
    `DTSTART:${stamp(booking.date, booking.start)}`,
    `DTEND:${stamp(booking.date, booking.end)}`,
    `SUMMARY:${esc(`${booking.serviceName} – ${salonName}`)}`,
    `DESCRIPTION:${esc(`Avec ${booking.staffName}. Prix : ${booking.price} €.`)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Rappel de rendez-vous',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadICS(booking, salonName) {
  const blob = new Blob([buildICS(booking, salonName)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rendez-vous-${booking.date}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
