import { useState } from 'react'
import { Avatar, Confirm, Empty, Field, Icon, Sheet } from '../../components/ui'
import { uid } from '../../lib/store'
import { todayISO } from '../../lib/time'

export default function Team({ state, setState, notify, goTab }) {
  const { staff, services, bookings } = state
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  const save = (person) => {
    setState((s) => ({
      ...s,
      staff: s.staff.some((x) => x.id === person.id) ? s.staff.map((x) => (x.id === person.id ? person : x)) : [...s.staff, person],
    }))
    setEditing(null)
    notify('Coiffeur enregistré')
  }

  const upcomingOf = (id) => bookings.filter((b) => b.staffId === id && b.status === 'confirmed' && b.date >= todayISO()).length

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">Équipe</h1>
        <button className="btn btn-gold btn-sm" onClick={() => setEditing({})}>
          <Icon name="plus" size={16} /> Ajouter
        </button>
      </div>
      {!services.length && (
        <p className="alert soft">
          Astuce : créez d’abord vos prestations pour pouvoir les attribuer.{' '}
          <button className="btn-link" onClick={() => goTab('services')}>
            Aller aux prestations
          </button>
        </p>
      )}
      {!staff.length ? (
        <Empty icon="users" title="Aucun coiffeur" text="Ajoutez les membres de votre équipe et cochez les prestations que chacun réalise.">
          <button className="btn btn-gold" onClick={() => setEditing({})}>
            <Icon name="plus" size={16} /> Ajouter un coiffeur
          </button>
        </Empty>
      ) : (
        <div className="list">
          {staff.map((p) => {
            const names = services.filter((s) => p.serviceIds.includes(s.id)).map((s) => s.name)
            return (
              <div key={p.id} className="card">
                <Avatar name={p.name} />
                <div className="card-main">
                  <strong>{p.name}</strong>
                  <span className="muted small">{names.length ? names.join(', ') : <em className="warn">aucune prestation cochée</em>}</span>
                </div>
                <button className="icon-btn" onClick={() => setEditing(p)} aria-label={`Modifier ${p.name}`}>
                  <Icon name="edit" size={17} />
                </button>
                <button className="icon-btn" onClick={() => setToDelete(p)} aria-label={`Retirer ${p.name}`}>
                  <Icon name="trash" size={17} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {editing && <PersonForm initial={editing} services={services} onSave={save} onClose={() => setEditing(null)} />}
      {toDelete && (
        <Confirm
          title={`Retirer ${toDelete.name} ?`}
          text={
            upcomingOf(toDelete.id)
              ? `${upcomingOf(toDelete.id)} rendez-vous à venir restent visibles dans le planning ; pensez à les annuler ou à prévenir les clients.`
              : 'Il ne sera plus proposé aux clients.'
          }
          confirmLabel="Retirer"
          danger
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            setState((s) => ({ ...s, staff: s.staff.filter((x) => x.id !== toDelete.id) }))
            setToDelete(null)
            notify('Coiffeur retiré')
          }}
        />
      )}
    </>
  )
}

function PersonForm({ initial, services, onSave, onClose }) {
  const [name, setName] = useState(initial.name || '')
  const [serviceIds, setServiceIds] = useState(initial.serviceIds || services.map((s) => s.id))
  const [tried, setTried] = useState(false)
  const error = !name.trim() && 'Indiquez un prénom.'

  return (
    <Sheet title={initial.id ? 'Modifier le coiffeur' : 'Nouveau coiffeur'} onClose={onClose}>
      <form
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          setTried(true)
          if (!error) onSave({ id: initial.id || uid(), name: name.trim(), serviceIds })
        }}
      >
        <Field label="Prénom" error={tried && error}>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        {services.length > 0 && (
          <fieldset className="checks">
            <legend>Prestations réalisées</legend>
            {services.map((s) => (
              <label key={s.id} className="check">
                <input
                  type="checkbox"
                  checked={serviceIds.includes(s.id)}
                  onChange={(e) => setServiceIds((ids) => (e.target.checked ? [...ids, s.id] : ids.filter((x) => x !== s.id)))}
                />
                <span>{s.name}</span>
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
