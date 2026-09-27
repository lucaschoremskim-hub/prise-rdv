import { useMemo, useState } from 'react'
import { Avatar, Confirm, Empty, Field, Icon } from '../components/ui'
import BookingSummary from '../components/BookingSummary'
import { useLang } from '../lib/i18n.jsx'
import { eligibleStaff, isDayBookable, pickStaff, slotsForDay } from '../lib/slots'
import { salonTitle, uid } from '../lib/store'
import { addDaysISO, fromISO, todayISO } from '../lib/time'
import { downloadICS } from '../lib/ics'
import { emailEnabled, sendConfirmationEmail } from '../lib/email'

const PHONE_RE = /^(?:\+33|0033|0)[1-9]\d{8}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validate(form, errText) {
  const errors = {}
  if (form.name.trim().length < 2) errors.name = errText.name
  if (!PHONE_RE.test(form.phone.replace(/[\s.\-()]/g, ''))) errors.phone = errText.phone
  if (!EMAIL_RE.test(form.email.trim())) errors.email = errText.email
  return errors
}

export default function Booking({ state, addBooking, cancelBooking, notify }) {
  const { lang, s, fmt } = useLang()
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
  const title = salonTitle(settings, lang)

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
        <h1 className="display">{cancelled ? s.booking.confirm.cancelledTitle : s.booking.confirm.confirmedTitle}</h1>
        <p className="muted center">{cancelled ? s.booking.confirm.cancelledText : s.booking.confirm.greeting(current.name.split(' ')[0], title)}</p>

        <BookingSummary {...current} />

        {!cancelled && (
          <p className={`email-status email-${emailStatus}`}>
            <Icon name="mail" size={16} />
            {emailStatus === 'sending' && s.booking.confirm.emailSending(current.email)}
            {emailStatus === 'sent' && s.booking.confirm.emailSent(current.email)}
            {emailStatus === 'error' && s.booking.confirm.emailError}
            {emailStatus === 'disabled' && s.booking.confirm.emailDisabled}
          </p>
        )}

        <div className="stack">
          {!cancelled && (
            <button className="btn btn-gold btn-block" onClick={() => downloadICS(current, title, lang)}>
              <Icon name="download" /> {s.booking.confirm.addToCalendar}
            </button>
          )}
          <button className="btn btn-ghost btn-block" onClick={reset}>
            {s.booking.confirm.another}
          </button>
          {!cancelled && (
            <button className="btn btn-link danger" onClick={() => setAskCancel(true)}>
              {s.booking.confirm.cancelThis}
            </button>
          )}
        </div>
        {askCancel && (
          <Confirm
            title={s.booking.cancelDialog.title}
            text={s.booking.cancelDialog.text}
            confirmLabel={s.booking.cancelDialog.confirm}
            danger
            onCancel={() => setAskCancel(false)}
            onConfirm={() => {
              cancelBooking(current.id, 'client')
              setAskCancel(false)
              notify(s.booking.notifyCancelled)
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
        <Empty icon="scissors" title={s.booking.notReady.title} text={s.booking.notReady.text}>
          <a className="btn btn-ghost" href="#/pro">
            <Icon name="lock" size={16} /> {s.booking.notReady.link}
          </a>
        </Empty>
      </section>
    )
  }

  const confirm = async () => {
    setTouched(true)
    if (Object.keys(validate(form, s.errors)).length) return
    // Revérification : le créneau a pu être pris entre-temps (autre onglet).
    const fresh = slotsForDay(state, service, staffChoice, date).find((sl) => sl.start === slot.start)
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
      const res = await sendConfirmationEmail(booking, title, lang)
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
          <button className="icon-btn" onClick={() => go(step - 1)} aria-label={s.steps.prevAria}>
            <Icon name="back" />
          </button>
          <div className="stepper" aria-label={s.steps.aria(step + 1)}>
            {s.steps.labels.map((label, i) => (
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
            <h2 className="section-title">{s.booking.chooseService}</h2>
            <div className="list">
              {bookableServices.map((sv, i) => (
                <button
                  key={sv.id}
                  className="card card-action"
                  style={{ '--i': i }}
                  onClick={() => {
                    setServiceId(sv.id)
                    setSlot(null)
                    const pool = eligibleStaff(staff, sv.id)
                    if (staffChoice && staffChoice !== 'any' && !pool.some((p) => p.id === staffChoice)) setStaffChoice(null)
                    go(1)
                  }}
                >
                  <div className="card-main">
                    <strong>{sv.name}</strong>
                    <span className="muted small">
                      <Icon name="clock" size={14} /> {fmt.duration(sv.duration)}
                    </span>
                  </div>
                  <span className="price">{fmt.price(sv.price)}</span>
                  <Icon name="chevron" />
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && service && (
          <>
            <h2 className="section-title">{s.booking.withWhom}</h2>
            <p className="muted small lead">
              {service.name} · {fmt.duration(service.duration)}
            </p>
            <div className="list">
              {[{ id: 'any', name: s.booking.anyStaff, any: true }, ...eligibleStaff(staff, service.id)].map((p, i) => (
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
                    {p.any && <span className="muted small">{s.booking.firstAvailable}</span>}
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
            onPick={(sl) => {
              setSlot(sl)
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
              staffName: staffChoice === 'any' ? s.booking.firstAvailable : staff.find((s) => s.id === staffChoice)?.name,
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
  const { s } = useLang()
  return (
    <div className="hero">
      <p className="eyebrow">{s.hero.eyebrow}</p>
      <h1 className="display">{title}</h1>
      <div className="ornament">
        <span />
        <Icon name="sparkle" size={14} />
        <span />
      </div>
      <p className="muted center">{s.hero.subtitle}</p>
    </div>
  )
}

function SlotPicker({ state, service, staffChoice, date, setDate, slot, conflict, onPick, onNext }) {
  const { s, fmt } = useLang()
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
  const morning = slots.filter((sl) => sl.start < 12 * 60)
  const afternoon = slots.filter((sl) => sl.start >= 12 * 60)

  return (
    <>
      <h2 className="section-title">{s.slot.when}</h2>
      {conflict && <p className="alert">{s.slot.conflict}</p>}
      <div className="days" role="listbox" aria-label={s.slot.daysAria}>
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
              <small>{d.iso === today ? s.slot.today : fmt.dayShort(d.iso)}</small>
              <strong>{dt.getDate()}</strong>
              <small>{d.open ? (d.count ? fmt.monthShort(d.iso) : s.slot.full) : s.slot.closed}</small>
            </button>
          )
        })}
      </div>

      {!firstAvailable ? (
        <Empty icon="calendar" title={s.slot.none.title} text={s.slot.none.text} />
      ) : (
        <div className="slots-wrap">
          {[
            [s.slot.morning, morning],
            [s.slot.afternoon, afternoon],
          ].map(
            ([label, list]) =>
              list.length > 0 && (
                <div key={label}>
                  <h3 className="slot-group">{label}</h3>
                  <div className="slots">
                    {list.map((sl, i) => (
                      <button
                        key={sl.start}
                        style={{ '--i': i }}
                        className={`slot${slot?.start === sl.start && date === selected ? ' active' : ''}`}
                        onClick={() => {
                          setDate(selected)
                          onPick(sl)
                        }}
                      >
                        {fmt.time(sl.start)}
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
            {s.slot.continue(fmt.time(slot.start))} <Icon name="arrow" />
          </button>
        )}
      </div>
    </>
  )
}

function ContactForm({ form, setForm, touched, onSubmit, summary }) {
  const { s } = useLang()
  const errors = touched ? validate(form, s.errors) : {}
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      noValidate
    >
      <h2 className="section-title">{s.contact.title}</h2>
      <BookingSummary {...summary} />
      <div className="form">
        <Field label={s.contact.name} error={errors.name}>
          <input value={form.name} onChange={set('name')} autoComplete="name" placeholder={s.contact.namePlaceholder} />
        </Field>
        <Field label={s.contact.phone} error={errors.phone}>
          <input value={form.phone} onChange={set('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder={s.contact.phonePlaceholder} />
        </Field>
        <Field label={s.contact.email} error={errors.email} hint={s.contact.emailHint}>
          <input value={form.email} onChange={set('email')} type="email" inputMode="email" autoComplete="email" placeholder={s.contact.emailPlaceholder} />
        </Field>
      </div>
      <button type="submit" className="btn btn-gold btn-block btn-lg">
        <Icon name="check" /> {s.contact.submit}
      </button>
      <p className="muted tiny center">{s.contact.footnote}</p>
    </form>
  )
}
