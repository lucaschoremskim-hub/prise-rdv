import { useState } from 'react'
import { Confirm, Field, Icon } from '../../components/ui'
import { useLang } from '../../lib/i18n.jsx'
import { initialState } from '../../lib/store'
import { emailEnabled } from '../../lib/email'

const HORIZONS = [7, 14, 30, 60, 90]
const BUFFERS = [0, 5, 10, 15]

export default function Settings({ state, setState, notify }) {
  const { s } = useLang()
  const { settings } = state
  const [name, setName] = useState(settings.salonName)
  const [pin, setPin] = useState('')
  const [askReset, setAskReset] = useState(false)

  const patch = (p, msg) => {
    setState((st) => ({ ...st, settings: { ...st.settings, ...p } }))
    notify(msg)
  }

  const pinValid = /^\d{4}$/.test(pin)

  return (
    <>
      <h1 className="page-title">{s.settings.title}</h1>

      <div className="panel">
        <h2 className="section-title">{s.settings.salonPanel}</h2>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            patch({ salonName: name.trim() }, s.settings.notifyNameSaved)
          }}
        >
          <Field label={s.settings.salonNameLabel} hint={s.settings.salonNameHint}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={s.settings.salonNamePlaceholder} />
          </Field>
          <button className="btn btn-gold btn-sm" type="submit" disabled={name.trim() === settings.salonName}>
            {s.common.save}
          </button>
        </form>
      </div>

      <div className="panel">
        <h2 className="section-title">{s.settings.rulesPanel}</h2>
        <Field label={s.settings.horizonLabel}>
          <select value={settings.horizonDays} onChange={(e) => patch({ horizonDays: Number(e.target.value) }, s.settings.notifyHorizonSaved)}>
            {HORIZONS.map((d) => (
              <option key={d} value={d}>
                {s.settings.horizonOption(d)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={s.settings.bufferLabel} hint={s.settings.bufferHint}>
          <select value={settings.bufferMin} onChange={(e) => patch({ bufferMin: Number(e.target.value) }, s.settings.notifyBufferSaved)}>
            {BUFFERS.map((b) => (
              <option key={b} value={b}>
                {s.settings.bufferOption(b)}
              </option>
            ))}
          </select>
        </Field>
        <p className="muted small">{s.settings.rulesNote}</p>
      </div>

      <div className="panel">
        <h2 className="section-title">{s.settings.pinPanel}</h2>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!pinValid) return
            patch({ pin }, s.settings.notifyPinChanged)
            setPin('')
          }}
        >
          <Field label={s.settings.pinLabel} hint={s.settings.pinHint}>
            <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="••••" />
          </Field>
          <button className="btn btn-gold btn-sm" type="submit" disabled={!pinValid}>
            {s.settings.change}
          </button>
        </form>
      </div>

      <div className="panel">
        <h2 className="section-title">{s.settings.emailPanel}</h2>
        <p className={`email-status email-${emailEnabled ? 'sent' : 'disabled'}`}>
          <Icon name="mail" size={16} />
          {emailEnabled ? s.settings.emailOn : s.settings.emailOff}
        </p>
      </div>

      <div className="panel danger-zone">
        <h2 className="section-title">{s.settings.demoPanel}</h2>
        <p className="muted small">{s.settings.demoText}</p>
        <button className="btn btn-ghost danger" onClick={() => setAskReset(true)}>
          <Icon name="trash" size={16} /> {s.settings.resetBtn}
        </button>
      </div>

      {askReset && (
        <Confirm
          title={s.settings.resetDialog.title}
          text={s.settings.resetDialog.text}
          confirmLabel={s.settings.resetDialog.confirm}
          danger
          onCancel={() => setAskReset(false)}
          onConfirm={() => {
            setState(initialState)
            setName('')
            setAskReset(false)
            notify(s.settings.notifyReset)
          }}
        />
      )}
    </>
  )
}
