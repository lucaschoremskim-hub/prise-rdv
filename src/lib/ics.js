import { minToHHMM } from './time.js'

const stamp = (date, min) => `${date.replaceAll('-', '')}T${minToHHMM(min).replace(':', '')}00`
const esc = (s) => String(s).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n')

const TEXT = {
  fr: { with: (staff) => `Avec ${staff}.`, price: (p) => `Prix : ${p} €.`, reminder: 'Rappel de rendez-vous', file: (date) => `rendez-vous-${date}.ics` },
  en: { with: (staff) => `With ${staff}.`, price: (p) => `Price: €${p}.`, reminder: 'Appointment reminder', file: (date) => `appointment-${date}.ics` },
}

// Fichier agenda (.ics) reconnu par Google Agenda, Apple Calendrier et Outlook.
export function buildICS(booking, salonName, lang = 'fr') {
  const t = TEXT[lang] || TEXT.fr
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
    `DESCRIPTION:${esc(`${t.with(booking.staffName)} ${t.price(booking.price)}`)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${t.reminder}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadICS(booking, salonName, lang = 'fr') {
  const t = TEXT[lang] || TEXT.fr
  const blob = new Blob([buildICS(booking, salonName, lang)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = t.file(booking.date)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
