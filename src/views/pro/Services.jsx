import { useState } from 'react'
import { Confirm, Empty, Field, Icon, Sheet } from '../../components/ui'
import { uid } from '../../lib/store'
import { formatDuration, formatPrice } from '../../lib/time'

export default function Services({ state, setState, notify }) {
  const { services, staff } = state
  const [editing, setEditing] = useState(null) // prestation en cours d'édition, ou {} pour une nouvelle
  const [toDelete, setToDelete] = useState(null)

  const save = (svc, staffIds) => {
    setState((s) => ({
      ...s,
      services: s.services.some((x) => x.id === svc.id) ? s.services.map((x) => (x.id === svc.id ? svc : x)) : [...s.services, svc],
      staff: s.staff.map((p) => {
        const has = p.serviceIds.includes(svc.id)
        const want = staffIds.includes(p.id)
        if (has === want) return p
        return { ...p, serviceIds: want ? [...p.serviceIds, svc.id] : p.serviceIds.filter((id) => id !== svc.id) }
      }),
    }))
    setEditing(null)
    notify('Prestation enregistrée')
  }

  const remove = (svc) => {
    // Les rendez-vous déjà pris gardent une copie du nom et du prix : rien ne se perd.
    setState((s) => ({
      ...s,
      services: s.services.filter((x) => x.id !== svc.id),
      staff: s.staff.map((p) => ({ ...p, serviceIds: p.serviceIds.filter((id) => id !== svc.id) })),
    }))
    setToDelete(null)
    notify('Prestation supprimée')
  }

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Prestations</h1>
        <button className="btn btn-gold btn-sm" onClick={() => setEditing({})}>
          <Icon name="plus" size={16} /> Ajouter
        </button>
      </div>
      {!services.length ? (
        <Empty icon="scissors" title="Aucune prestation" text="Ajoutez ce que vous proposez, avec sa durée et son prix.">
          <button className="btn btn-gold" onClick={() => setEditing({})}>
            <Icon name="plus" size={16} /> Ajouter une prestation
          </button>
        </Empty>
      ) : (
        <div className="list">
          {services.map((svc) => {
            const who = staff.filter((p) => p.serviceIds.includes(svc.id))
            return (
              <div key={svc.id} className="card">
                <div className="card-main">
                  <strong>{svc.name}</strong>
                  <span className="muted small">
                    {formatDuration(svc.duration)} · {who.length ? who.map((p) => p.name).join(', ') : <em className="warn">aucun coiffeur : invisible pour les clients</em>}
                  </span>
                </div>
                <span className="price">{formatPrice(svc.price)}</span>
                <button className="icon-btn" onClick={() => setEditing(svc)} aria-label={`Modifier ${svc.name}`}>
                  <Icon name="edit" size={17} />
                </button>
                <button className="icon-btn" onClick={() => setToDelete(svc)} aria-label={`Supprimer ${svc.name}`}>
                  <Icon name="trash" size={17} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {editing && <ServiceForm initial={editing} staff={staff} onSave={save} onClose={() => setEditing(null)} />}
      {toDelete && (
        <Confirm
          title="Supprimer la prestation ?"
          text={`« ${toDelete.name} » ne sera plus proposée. Les rendez-vous déjà pris sont conservés.`}
          confirmLabel="Supprimer"
          danger
          onCancel={() => setToDelete(null)}
          onConfirm={() => remove(toDelete)}
        />
      )}
    </>
  )
}

function ServiceForm({ initial, staff, onSave, onClose }) {
  const isNew = !initial.id
  const [name, setName] = useState(initial.name || '')
  const [duration, setDuration] = useState(initial.duration ? String(initial.duration) : '')
  const [price, setPrice] = useState(initial.price !== undefined ? String(initial.price) : '')
  const [staffIds, setStaffIds] = useState(isNew ? staff.map((p) => p.id) : staff.filter((p) => p.serviceIds.includes(initial.id)).map((p) => p.id))
  const [tried, setTried] = useState(false)

  const d = Number(duration)
  const p = Number(String(price).replace(',', '.'))
  const errors = {
    name: !name.trim() && 'Donnez un nom à la prestation.',
    duration: (!Number.isInteger(d) || d < 5 || d > 600) && 'Durée en minutes, entre 5 et 600.',
    price: (price === '' || Number.isNaN(p) || p < 0) && 'Prix en euros (0 accepté).',
  }
  const valid = !errors.name && !errors.duration && !errors.price

  return (
    <Sheet title={isNew ? 'Nouvelle prestation' : 'Modifier la prestation'} onClose={onClose}>
      <form
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          setTried(true)
          if (valid) onSave({ id: initial.id || uid(), name: name.trim(), duration: d, price: Math.round(p * 100) / 100 }, staffIds)
        }}
      >
        <Field label="Nom" error={tried && errors.name}>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div className="grid-2">
          <Field label="Durée (min)" error={tried && errors.duration}>
            <input value={duration} onChange={(e) => setDuration(e.target.value)} type="number" inputMode="numeric" min="5" step="5" />
          </Field>
          <Field label="Prix (€)" error={tried && errors.price}>
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
          </Field>
        </div>
        {staff.length > 0 && (
          <fieldset className="checks">
            <legend>Réalisée par</legend>
            {staff.map((pp) => (
              <label key={pp.id} className="check">
                <input
                  type="checkbox"
                  checked={staffIds.includes(pp.id)}
                  onChange={(e) => setStaffIds((ids) => (e.target.checked ? [...ids, pp.id] : ids.filter((x) => x !== pp.id)))}
                />
                <span>{pp.name}</span>
              </label>
            ))}
          </fieldset>
        )}
        <button className="btn btn-gold btn-block" type="submit">
          Enregistrer
        </button>
      </form>
    </Sheet>
  )
}
