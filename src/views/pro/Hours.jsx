import { useState } from 'react'
import { Icon } from '../../components/ui'
import { DAY_NAMES, hhmmToMin, minToHHMM } from '../../lib/time'

const ORDER = [1, 2, 3, 4, 5, 6, 0] // lundi → dimanche

function dayError(day) {
  if (!day.open) return null
  if (!day.ranges.length) return 'Ajoutez au moins une plage ou fermez ce jour.'
  const sorted = [...day.ranges].sort((a, b) => a[0] - b[0])
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i][0] >= sorted[i][1]) return 'L’heure de fin doit suivre l’heure de début.'
    if (i && sorted[i][0] < sorted[i - 1][1]) return 'Deux plages se chevauchent.'
  }
  return null
}

export default function Hours({ state, setState, notify }) {
  const [hours, setHours] = useState(state.settings.hours)
  const dirty = JSON.stringify(hours) !== JSON.stringify(state.settings.hours)
  const hasError = ORDER.some((d) => dayError(hours[d]))

  const update = (d, fn) => setHours((h) => ({ ...h, [d]: fn(h[d]) }))

  const save = () => {
    const clean = Object.fromEntries(Object.entries(hours).map(([d, v]) => [d, { ...v, ranges: [...v.ranges].sort((a, b) => a[0] - b[0]) }]))
    setState((s) => ({ ...s, settings: { ...s.settings, hours: clean } }))
    notify('Horaires enregistrés')
  }

  return (
    <>
      <h1 className="page-title">Horaires d’ouverture</h1>
      <p className="muted small lead">Communs à toute l’équipe. Les rendez-vous déjà pris ne sont pas modifiés.</p>
      <div className="list">
        {ORDER.map((d) => {
          const day = hours[d]
          const err = dayError(day)
          return (
            <div key={d} className={`hours-day${day.open ? '' : ' is-closed'}`}>
              <div className="hours-head">
                <strong>{DAY_NAMES[d]}</strong>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={day.open}
                    onChange={(e) =>
                      update(d, (v) => ({ open: e.target.checked, ranges: e.target.checked && !v.ranges.length ? [[9 * 60, 12 * 60]] : v.ranges }))
                    }
                  />
                  <span aria-hidden="true" />
                  <small>{day.open ? 'Ouvert' : 'Fermé'}</small>
                </label>
              </div>
              {day.open && (
                <div className="ranges">
                  {day.ranges.map(([a, b], i) => (
                    <div key={i} className="range">
                      <input
                        type="time"
                        step="300"
                        value={minToHHMM(a)}
                        aria-label="Début"
                        onChange={(e) => e.target.value && update(d, (v) => ({ ...v, ranges: v.ranges.map((r, j) => (j === i ? [hhmmToMin(e.target.value), r[1]] : r)) }))}
                      />
                      <span className="muted">à</span>
                      <input
                        type="time"
                        step="300"
                        value={minToHHMM(b)}
                        aria-label="Fin"
                        onChange={(e) => e.target.value && update(d, (v) => ({ ...v, ranges: v.ranges.map((r, j) => (j === i ? [r[0], hhmmToMin(e.target.value)] : r)) }))}
                      />
                      <button className="icon-btn" aria-label="Retirer la plage" onClick={() => update(d, (v) => ({ ...v, ranges: v.ranges.filter((_, j) => j !== i) }))}>
                        <Icon name="x" size={16} />
                      </button>
                    </div>
                  ))}
                  {day.ranges.length < 3 && (
                    <button
                      className="btn-link small"
                      onClick={() =>
                        update(d, (v) => {
                          const last = v.ranges[v.ranges.length - 1]
                          const start = last ? Math.min(last[1] + 60, 22 * 60) : 9 * 60
                          return { ...v, ranges: [...v.ranges, [start, Math.min(start + 180, 23 * 60 + 55)]] }
                        })
                      }
                    >
                      <Icon name="plus" size={14} /> Ajouter une plage
                    </button>
                  )}
                  {err && <p className="field-error">{err}</p>}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className={`bottom-bar${dirty ? ' show' : ''}`}>
        {dirty && (
          <button className="btn btn-gold btn-block" disabled={hasError} onClick={save}>
            {hasError ? 'Corrigez les horaires en rouge' : 'Enregistrer les horaires'}
          </button>
        )}
      </div>
    </>
  )
}
