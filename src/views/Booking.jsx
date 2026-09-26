import { useMemo, useState } from 'react'
import { Avatar, Confirm, Empty, Field, Icon } from '../components/ui'
import BookingSummary from '../components/BookingSummary'
import { eligibleStaff, isDayBookable, pickStaff, slotsForDay } from '../lib/slots'
import { salonTitle, uid } from '../lib/store'
import { addDaysISO, DAY_SHORT, formatDuration, formatPrice, fromISO, minToLabel, monthShort, todayISO } from '../lib/time'
import { downloadICS } from '../lib/ics'
import { emailEnabled, sendConfirmationEmail } from '../lib/email'

const STEPS = ['Prestation', 'Coiffeur', 'Créneau', 'Coordonnées']

const PHONE_RE = /^(?:\+33|0033|0)[1-9]\d{8}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validate(form) {
  const errors = {}
  if (form.name.trim().length < 2) errors.name = 'Indiquez votre nom et prénom.'
  if (!PHONE_RE.test(form.phone.replace(/[\s.\-()]/g, ''))) errors.phone = 'Numéro invalide (ex. 06 12 34 56 78).'
  if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Adresse e-mail invalide.'
  return errors
}

export default function Booking({ state, addBooking, cancelBooking, notify }) {
  const { settings, services, staff, bookings } = state
  const [step, setStep] = useState(0)
  const [serviceId, setServiceId] = useState(null)
  const [staffChoice, setStaffChoice] = useState(null)
  const [date, setDate] = useState(null)
  const [slot, setSlot] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [touched, setTouched] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [done, setDone] = useState(null) // rendez-vous confirmé
  const [emailStatus, setEmailStatus] = useState('disabled')
  const [askCancel, setAskCancel] = useState(false)

  const service = services.find((s) => s.id === serviceId)
  const bookableServices = services.filter((s) => eligibleStaff(staff, s.id).length)
  const title = salonTitle(settings)

  const go = (n) => {
    setStep(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const reset = () => {
    setStep(0)
    setServiceId(null)
    setStaffChoice(null)
    setDate(null)
    setSlot(null)
    setDone(null)
    setTouched(false)
    setConflict(false)
    window.scrollTo({ top: 0 })
  }

  // ---------- Écran de confirmation ----------
  if (done) {
    const current = bookings.find((b) => b.id === done.id) || done
    const cancelled = current.status === 'cancelled'
    return (
      <section className="step-anim confirm-screen">
        <div className={`check-badge${cancelled ? ' is-cancelled' : ''}`}>
          {cancelled ? (
            <Icon name="x" size={40} />
          ) : (
            <svg viewBox="0 0 52 52" width="56" height="56" aria-hidden="true">
              <circle className="check-circle" cx="26" cy="26" r="24" fill="none" />
              <path className="check-path" fill="none" d="M15 27l7 7 15-16" />
            </svg>
          )}
        </div>
        <h1 className="display">{cancelled ? 'Rendez-vous annulé' : 'C’est réservé !'}</h1>
        <p className="muted center">
          {cancelled ? 'Le créneau a été libéré.' : `Merci ${current.name.split(' ')[0]}, ${title} vous attend.`}
        </p>

        <BookingSummary {...current} />

        {!cancelled && (
          <p className={`email-status email-${emailStatus}`}>
            <Icon name="mail" size={16} />
            {emailStatus === 'sending' && <>Envoi de la confirmation à {current.email}…</>}
            {emailStatus === 'sent' && <>Confirmation envoyée à {current.email}</>}
            {emailStatus === 'error' && <>L’e-mail n’a pas pu partir. Votre rendez-vous est bien enregistré.</>}
            {emailStatus === 'disabled' && <>Démo : l’envoi d’e-mail n’est pas activé, cette page fait foi.</>}
          </p>
        )}

        <div className="stack">
          {!cancelled && (
            <button className="btn btn-gold btn-block" onClick={() => downloadICS(current, title)}>
              <Icon name="download" /> Ajouter à mon agenda
            </button>
          )}
          <button className="btn btn-ghost btn-block" onClick={reset}>
            Prendre un autre rendez-vous
          </button>
          {!cancelled && (
            <button className="btn btn-link danger" onClick={() => setAskCancel(true)}>
              Annuler ce rendez-vous
            </button>
          )}
        </div>
        {askCancel && (
          <Confirm
            title="Annuler le rendez-vous ?"
            text="Le créneau sera libéré et proposé à d’autres clients."
            confirmLabel="Oui, annuler"
            danger
            onCancel={() => setAskCancel(false)}
            onConfirm={() => {
              cancelBooking(current.id, 'client')
              setAskCancel(false)
              notify('Rendez-vous annulé')
            }}
          />
        )}
      </section>
    )
  }

  // ---------- Salon pas encore configuré ----------
  if (!bookableServices.length) {
    return (
      <section className="step-anim">
        <Hero title={title} />
        <Empty icon="scissors" title="Réservations bientôt ouvertes" text="Le salon n’a pas encore publié ses prestations. Revenez très vite !">
          <a className="btn btn-ghost" href="#/pro">
            <Icon name="lock" size={16} /> Je suis le commerçant : configurer
          </a>
        </Empty>
      </section>
    )
  }

  const confirm = async () => {
    setTouched(true)
    if (Object.keys(validate(form)).length) return
    // Revérification : le créneau a pu être pris entre-temps (autre onglet).
    const fresh = slotsForDay(state, service, staffChoice, date).find((s) => s.start === slot.start)
    if (!fresh) {
      setConflict(true)
      setSlot(null)
      go(2)
      return
    }
    const staffId = staffChoice === 'any' ? pickStaff(fresh.staffIds, bookings, date) : staffChoice
    const booking = {
      id: uid(),
      serviceId: service.id,
      serviceName: service.name,
      price: service.price,
      staffId,
      staffName: staff.find((s) => s.id === staffId)?.name || '',
      date,
      start: fresh.start,
      end: fresh.end,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    }
    addBooking(booking)
    setDone(booking)
    window.scrollTo({ top: 0 })
    if (emailEnabled) {
      setEmailStatus('sending')
      const res = await sendConfirmationEmail(booking, title)
      setEmailStatus(res.sent ? 'sent' : 'error')
    } else {
      setEmailStatus('disabled')
    }
  }

  return (
    <section>
      {step === 0 ? (
        <Hero title={title} />
      ) : (
        <div className="flow-head">
          <button className="icon-btn" onClick={() => go(step - 1)} aria-label="Étape précédente">
            <Icon name="back" />
          </button>
          <div className="stepper" aria-label={`Étape ${step + 1} sur 4`}>
            {STEPS.map((label, i) => (
              <span key={label} className={i < step ? 'done' : i === step ? 'current' : ''}>
                <i />
                <small>{label}</small>
              </span>
            ))}
          </div>
        </div>
      )}

      <div key={step} className="step-anim">
        {step === 0 && (
          <>
            <h2 className="section-title">Choisissez une prestation</h2>
            <div className="list">
              {bookableServices.map((s, i) => (
                <button
                  key={s.id}
                  className="card card-action"
                  style={{ '--i': i }}
                  onClick={() => {
                    setServiceId(s.id)
                    setSlot(null)
                    const pool = eligibleStaff(staff, s.id)
                    if (staffChoice && staffChoice !== 'any' && !pool.some((p) => p.id === staffChoice)) setStaffChoice(null)
                    go(1)
                  }}
                >
                  <div className="card-main">
                    <strong>{s.name}</strong>
                    <span className="muted small">
                      <Icon name="clock" size={14} /> {formatDuration(s.duration)}
                    </span>
                  </div>
                  <span className="price">{formatPrice(s.price)}</span>
                  <Icon name="chevron" />
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && service && (
          <>
            <h2 className="section-title">Avec qui ?</h2>
            <p className="muted small lead">{service.name} · {formatDuration(service.duration)}</p>
            <div className="list">
              {[{ id: 'any', name: 'Peu importe', any: true }, ...eligibleStaff(staff, service.id)].map((p, i) => (
                <button
                  key={p.id}
                  className={`card card-action${staffChoice === p.id ? ' selected' : ''}`}
                  style={{ '--i': i }}
                  onClick={() => {
                    setStaffChoice(p.id)
                    setSlot(null)
                    go(2)
                  }}
                >
                  <Avatar name={p.name} any={p.any} />
                  <div className="card-main">
                    <strong>{p.name}</strong>
                    {p.any && <span className="muted small">Le premier coiffeur disponible</span>}
                  </div>
                  <Icon name="chevron" />
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && service && (
          <SlotPicker
            state={state}
            service={service}
            staffChoice={staffChoice}
            date={date}
            setDate={setDate}
            slot={slot}
            conflict={conflict}
            onPick={(s) => {
              setSlot(s)
              setConflict(false)
            }}
            onNext={() => go(3)}
          />
        )}

        {step === 3 && service && slot && (
          <ContactForm
            form={form}
            setForm={setForm}
            touched={touched}
            onSubmit={confirm}
            summary={{
              serviceName: service.name,
              price: service.price,
              staffName: staffChoice === 'any' ? 'Premier coiffeur disponible' : staff.find((s) => s.id === staffChoice)?.name,
              date,
              start: slot.start,
              end: slot.end,
            }}
          />
        )}
      </div>
    </section>
  )
}

function Hero({ title }) {
  return (
    <div className="hero">
      <p className="eyebrow">Réservation en ligne</p>
      <h1 className="display">{title}</h1>
      <div className="ornament">
        <span />
        <Icon name="sparkle" size={14} />
        <span />
      </div>
      <p className="muted center">Choisissez votre prestation, votre coiffeur et votre créneau en moins d’une minute.</p>
    </div>
  )
}

function SlotPicker({ state, service, staffChoice, date, setDate, slot, conflict, onPick, onNext }) {
  const { settings } = state
  const today = todayISO()

  // Jours de l'horizon, avec le nombre de créneaux libres de chacun.
  const days = useMemo(() => {
    const out = []
    for (let i = 0; i <= settings.horizonDays; i++) {
      const iso = addDaysISO(today, i)
      const open = isDayBookable(settings, iso)
      out.push({ iso, open, count: open ? slotsForDay(state, service, staffChoice, iso).length : 0 })
    }
    return out
  }, [state, service, staffChoice, settings, today])

  const firstAvailable = days.find((d) => d.count)?.iso
  const selected = date && days.some((d) => d.iso === date) ? date : firstAvailable
  const slots = selected ? slotsForDay(state, service, staffChoice, selected) : []
  const morning = slots.filter((s) => s.start < 12 * 60)
  const afternoon = slots.filter((s) => s.start >= 12 * 60)

  return (
    <>
      <h2 className="section-title">Quand souhaitez-vous venir ?</h2>
      {conflict && <p className="alert">Ce créneau vient d’être réservé par quelqu’un d’autre. Choisissez-en un autre.</p>}
      <div className="days" role="listbox" aria-label="Jours">
        {days.map((d) => {
          const dt = fromISO(d.iso)
          const disabled = !d.count
          return (
            <button
              key={d.iso}
              role="option"
              aria-selected={d.iso === selected}
              className={`day${d.iso === selected ? ' active' : ''}${disabled ? ' disabled' : ''}`}
              disabled={disabled}
              onClick={() => {
                setDate(d.iso)
                onPick(null)
              }}
            >
              <small>{d.iso === today ? 'auj.' : DAY_SHORT[dt.getDay()]}</small>
              <strong>{dt.getDate()}</strong>
              <small>{d.open ? (d.count ? monthShort(d.iso) : 'complet') : 'fermé'}</small>
            </button>
          )
        })}
      </div>

      {!firstAvailable ? (
        <Empty icon="calendar" title="Aucun créneau disponible" text="Tout est complet sur la période ouverte à la réservation. Essayez un autre coiffeur ou revenez plus tard." />
      ) : (
        <div className="slots-wrap">
          {[
            ['Matin', morning],
            ['Après-midi', afternoon],
          ].map(
            ([label, list]) =>
              list.length > 0 && (
                <div key={label}>
                  <h3 className="slot-group">{label}</h3>
                  <div className="slots">
                    {list.map((s, i) => (
                      <button
                        key={s.start}
                        style={{ '--i': i }}
                        className={`slot${slot?.start === s.start && date === selected ? ' active' : ''}`}
                        onClick={() => {
                          setDate(selected)
                          onPick(s)
                        }}
                      >
                        {minToLabel(s.start)}
                      </button>
                    ))}
                  </div>
                </div>
              ),
          )}
        </div>
      )}

      <div className={`bottom-bar${slot ? ' show' : ''}`}>
        {slot && (
          <button className="btn btn-gold btn-block" onClick={onNext}>
            Continuer · {minToLabel(slot.start)} <Icon name="arrow" />
          </button>
        )}
      </div>
    </>
  )
}

function ContactForm({ form, setForm, touched, onSubmit, summary }) {
  const errors = touched ? validate(form) : {}
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      noValidate
    >
      <h2 className="section-title">Vos coordonnées</h2>
      <BookingSummary {...summary} />
      <div className="form">
        <Field label="Nom et prénom" error={errors.name}>
          <input value={form.name} onChange={set('name')} autoComplete="name" placeholder="Camille Martin" />
        </Field>
        <Field label="Téléphone" error={errors.phone}>
          <input value={form.phone} onChange={set('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="06 12 34 56 78" />
        </Field>
        <Field label="E-mail" error={errors.email} hint="Pour recevoir votre confirmation.">
          <input value={form.email} onChange={set('email')} type="email" inputMode="email" autoComplete="email" placeholder="camille@exemple.fr" />
        </Field>
      </div>
      <button type="submit" className="btn btn-gold btn-block btn-lg">
        <Icon name="check" /> Confirmer le rendez-vous
      </button>
      <p className="muted tiny center">Vos informations servent uniquement à ce rendez-vous.</p>
    </form>
  )
}
