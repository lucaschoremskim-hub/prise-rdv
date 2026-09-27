import { useState } from 'react'
import { Icon } from '../../components/ui'
import { useLang } from '../../lib/i18n.jsx'
import { hhmmToMin, minToHHMM, weekdayLong } from '../../lib/time'

const ORDER = [1, 2, 3, 4, 5, 6, 0] // lundi → dimanche

function dayError(day, s) {
  if (!day.open) return null
  if (!day.ranges.length) return s.hours.errNoRange
  const sorted = [...day.ranges].sort((a, b) => a[0] - b[0])
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i][0] >= sorted[i][1]) return s.hours.errOrder
    if (i && sorted[i][0] < sorted[i - 1][1]) return s.hours.errOverlap
  }
  return null
}

export default function Hours({ state, setState, notify }) {
  const { lang, s } = useLang()
  const [hours, setHours] = useState(state.settings.hours)
  const dirty = JSON.stringify(hours) !== JSON.stringify(state.settings.hours)
  const hasError = ORDER.some((d) => dayError(hours[d], s))

  const update = (d, fn) => setHours((h) => ({ ...h, [d]: fn(h[d]) }))

  const save = () => {
    const clean = Object.fromEntries(Object.entries(hours).map(([d, v]) => [d, { ...v, ranges: [...v.ranges].sort((a, b) => a[0] - b[0]) }]))
    setState((st) => ({ ...st, settings: { ...st.settings, hours: clean } }))
    notify(s.hours.notifySaved)
  }

  return (
    <>
      <h1 className="page-title">{s.hours.title}</h1>
      <p className="muted small lead">{s.hours.lead}</p>
      <div className="list">
        {ORDER.map((d) => {
          const day = hours[d]
          const err = dayError(day, s)
          return (
            <div key={d} className={`hours-day${day.open ? '' : ' is-closed'}`}>
              <div className="hours-head">
                <strong>{weekdayLong(d, lang)}</strong>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={day.open}
                    onChange={(e) =>
                      update(d, (v) => ({ open: e.target.checked, ranges: e.target.checked && !v.ranges.length ? [[9 * 60, 12 * 60]] : v.ranges }))
                    }
                  />
                  <span aria-hidden="true" />
                  <small>{day.open ? s.hours.open : s.hours.closed}</small>
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
                        aria-label={s.hours.startAria}
                        onChange={(e) => e.target.value && update(d, (v) => ({ ...v, ranges: v.ranges.map((r, j) => (j === i ? [hhmmToMin(e.target.value), r[1]] : r)) }))}
                      />
                      <span className="muted">{lang === 'en' ? 'to' : 'à'}</span>
                      <input
                        type="time"
                        step="300"
                        value={minToHHMM(b)}
                        aria-label={s.hours.endAria}
                        onChange={(e) => e.target.value && update(d, (v) => ({ ...v, ranges: v.ranges.map((r, j) => (j === i ? [r[0], hhmmToMin(e.target.value)] : r)) }))}
                      />
                      <button className="icon-btn" aria-label={s.hours.removeRangeAria} onClick={() => update(d, (v) => ({ ...v, ranges: v.ranges.filter((_, j) => j !== i) }))}>
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
                      <Icon name="plus" size={14} /> {s.hours.addRange}
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
            {hasError ? s.hours.fixErrors : s.hours.saveBtn}
          </button>
        )}
      </div>
    </>
  )
}
