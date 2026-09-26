import { formatDuration, formatLongDate, formatPrice, minToLabel } from './time.js'

// EmailJS (gratuit, sans serveur). Les trois identifiants viennent de .env.local en local
// et des « Environment Variables » sur Vercel. Sans eux, l'application confirme à l'écran seulement.
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

export const emailEnabled = Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY)

// Variables disponibles dans le modèle EmailJS : {{to_email}}, {{to_name}}, {{salon_name}},
// {{service_name}}, {{staff_name}}, {{date}}, {{time}}, {{duration}}, {{price}}, {{phone}}.
export async function sendConfirmationEmail(booking, salonName) {
  if (!emailEnabled) return { sent: false, reason: 'disabled' }
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: SERVICE_ID,
        template_id: TEMPLATE_ID,
        user_id: PUBLIC_KEY,
        template_params: {
          to_email: booking.email,
          to_name: booking.name,
          salon_name: salonName,
          service_name: booking.serviceName,
          staff_name: booking.staffName,
          date: formatLongDate(booking.date),
          time: minToLabel(booking.start),
          duration: formatDuration(booking.end - booking.start),
          price: formatPrice(booking.price),
          phone: booking.phone,
        },
      }),
    })
    return res.ok ? { sent: true } : { sent: false, reason: 'error' }
  } catch {
    return { sent: false, reason: 'error' }
  }
}
