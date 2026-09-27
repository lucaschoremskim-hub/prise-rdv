import { useState } from 'react'
import { Avatar, Confirm, Empty, Field, Icon, Sheet } from '../../components/ui'
import { useLang } from '../../lib/i18n.jsx'
import { uid } from '../../lib/store'
import { todayISO } from '../../lib/time'

export default function Team({ state, setState, notify, goTab }) {
  const { s } = useLang()
  const { staff, services, bookings } = state
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  const save = (person) => {
    setState((st) => ({
      ...st,
      staff: st.staff.some((x) => x.id === person.id) ? st.staff.map((x) => (x.id === person.id ? person : x)) : [...st.staff, person],
    }))
    setEditing(null)
    notify(s.team.notifySaved)
  }

  const upcomingOf = (id) => bookings.filter((b) => b.staffId === id && b.status === 'confirmed' && b.date >= todayISO()).length

  return (
    <>
      <div className="page-head">
        <h1 className="page-title">{s.team.title}</h1>
        <button className="btn btn-gold btn-sm" onClick={() => setEditing({})}>
          <Icon name="plus" size={16} /> {s.team.add}
        </button>
      </div>
      {!services.length && (
        <p className="alert soft">
          {s.team.tip}{' '}
          <button className="btn-link" onClick={() => goTab('services')}>
            {s.team.tipLink}
          </button>
        </p>
      )}
      {!staff.length ? (
        <Empty icon="users" title={s.team.empty.title} text={s.team.empty.text}>
          <button className="btn btn-gold" onClick={() => setEditing({})}>
            <Icon name="plus" size={16} /> {s.team.empty.add}
          </button>
        </Empty>
      ) : (
        <div className="list">
          {staff.map((p) => {
            const names = services.filter((sv) => p.serviceIds.includes(sv.id)).map((sv) => sv.name)
            return (
              <div key={p.id} className="card">
                <Avatar name={p.name} />
                <div className="card-main">
                  <strong>{p.name}</strong>
                  <span className="muted small">{names.length ? names.join(', ') : <em className="warn">{s.team.noServiceWarn}</em>}</span>
                </div>
                <button className="icon-btn" onClick={() => setEditing(p)} aria-label={s.team.editAria(p.name)}>
                  <Icon name="edit" size={17} />
                </button>
                <button className="icon-btn" onClick={() => setToDelete(p)} aria-label={s.team.removeAria(p.name)}>
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
          title={s.team.deleteDialog.title(toDelete.name)}
          text={upcomingOf(toDelete.id) ? s.team.deleteDialog.textUpcoming(upcomingOf(toDelete.id)) : s.team.deleteDialog.textSimple}
          confirmLabel={s.team.deleteDialog.confirm}
          danger
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            setState((st) => ({ ...st, staff: st.staff.filter((x) => x.id !== toDelete.id) }))
            setToDelete(null)
            notify(s.team.notifyRemoved)
          }}
        />
      )}
    </>
  )
}

function PersonForm({ initial, services, onSave, onClose }) {
  const { s } = useLang()
  const [name, setName] = useState(initial.name || '')
  const [serviceIds, setServiceIds] = useState(initial.serviceIds || services.map((sv) => sv.id))
  const [tried, setTried] = useState(false)
  const error = !name.trim() && s.team.errName

  return (
    <Sheet title={initial.id ? s.team.editTitle : s.team.newTitle} onClose={onClose}>
      <form
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          setTried(true)
          if (!error) onSave({ id: initial.id || uid(), name: name.trim(), serviceIds })
        }}
      >
        <Field label={s.team.nameLabel} error={tried && error}>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        {services.length > 0 && (
          <fieldset className="checks">
            <legend>{s.team.servicesLegend}</legend>
            {services.map((sv) => (
              <label key={sv.id} className="check">
                <input
                  type="checkbox"
                  checked={serviceIds.includes(sv.id)}
                  onChange={(e) => setServiceIds((ids) => (e.target.checked ? [...ids, sv.id] : ids.filter((x) => x !== sv.id)))}
                />
                <span>{sv.name}</span>
              </label>
            ))}
          </fieldset>
        )}
        <button className="btn btn-gold btn-block" type="submit">
          {s.common.save}
        </button>
      </form>
    </Sheet>
  )
}
