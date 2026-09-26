import { useState } from 'react'
import { Confirm, Field, Icon } from '../../components/ui'
import { initialState } from '../../lib/store'
import { emailEnabled } from '../../lib/email'

const HORIZONS = [7, 14, 30, 60, 90]
const BUFFERS = [0, 5, 10, 15]

export default function Settings({ state, setState, notify }) {
  const { settings } = state
  const [name, setName] = useState(settings.salonName)
  const [pin, setPin] = useState('')
  const [askReset, setAskReset] = useState(false)

  const patch = (p, msg) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...p } }))
    notify(msg)
  }

  const pinValid = /^\d{4}$/.test(pin)

  return (
    <>
      <h1 className="page-title">Réglages</h1>

      <div className="panel">
        <h2 className="section-title">Salon</h2>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            patch({ salonName: name.trim() }, 'Nom enregistré')
          }}
        >
          <Field label="Nom affiché aux clients" hint="Vide = « Votre salon ».">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre salon" />
          </Field>
          <button className="btn btn-gold btn-sm" type="submit" disabled={name.trim() === settings.salonName}>
            Enregistrer
          </button>
        </form>
      </div>

      <div className="panel">
        <h2 className="section-title">Règles de réservation</h2>
        <Field label="Réservation possible jusqu’à">
          <select value={settings.horizonDays} onChange={(e) => patch({ horizonDays: Number(e.target.value) }, 'Horizon enregistré')}>
            {HORIZONS.map((d) => (
              <option key={d} value={d}>
                {d} jours à l’avance{d === 30 ? ' (1 mois)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Battement entre deux rendez-vous" hint="Temps de préparation ajouté après chaque rendez-vous d’un coiffeur.">
          <select value={settings.bufferMin} onChange={(e) => patch({ bufferMin: Number(e.target.value) }, 'Battement enregistré')}>
            {BUFFERS.map((b) => (
              <option key={b} value={b}>
                {b ? `${b} minutes` : 'Aucun'}
              </option>
            ))}
          </select>
        </Field>
        <p className="muted small">Délai minimum : réservation au plus tard 2 heures avant le rendez-vous. Créneaux enchaînés selon la durée de la prestation.</p>
      </div>

      <div className="panel">
        <h2 className="section-title">Code d’accès</h2>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!pinValid) return
            patch({ pin }, 'Code modifié')
            setPin('')
          }}
        >
          <Field label="Nouveau code (4 chiffres)" hint="Protection de démonstration, sans vraie sécurité.">
            <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="••••" />
          </Field>
          <button className="btn btn-gold btn-sm" type="submit" disabled={!pinValid}>
            Changer
          </button>
        </form>
      </div>

      <div className="panel">
        <h2 className="section-title">E-mail de confirmation</h2>
        <p className={`email-status email-${emailEnabled ? 'sent' : 'disabled'}`}>
          <Icon name="mail" size={16} />
          {emailEnabled ? 'Activé : chaque client reçoit un e-mail (via EmailJS).' : 'Non configuré : confirmation à l’écran et fichier agenda seulement.'}
        </p>
      </div>

      <div className="panel danger-zone">
        <h2 className="section-title">Données de démonstration</h2>
        <p className="muted small">Tout est enregistré dans ce navigateur uniquement. La réinitialisation efface prestations, équipe, rendez-vous et réglages.</p>
        <button className="btn btn-ghost danger" onClick={() => setAskReset(true)}>
          <Icon name="trash" size={16} /> Réinitialiser la démo
        </button>
      </div>

      {askReset && (
        <Confirm
          title="Tout réinitialiser ?"
          text="L’application reviendra à son état de départ. Cette action est définitive."
          confirmLabel="Réinitialiser"
          danger
          onCancel={() => setAskReset(false)}
          onConfirm={() => {
            setState(initialState)
            setName('')
            setAskReset(false)
            notify('Démo réinitialisée')
          }}
        />
      )}
    </>
  )
}
