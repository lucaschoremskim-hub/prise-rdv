import { useEffect, useState } from 'react'

const KEY = 'prise-rdv-v1'

// Horaires par défaut fournis par le commerçant (0 = dimanche). Plages en minutes depuis minuit.
const MORNING_AFTERNOON = [[9 * 60, 12 * 60], [14 * 60, 19 * 60]]
export const DEFAULT_HOURS = {
  0: { open: false, ranges: [] },
  1: { open: false, ranges: [] },
  2: { open: true, ranges: MORNING_AFTERNOON },
  3: { open: true, ranges: MORNING_AFTERNOON },
  4: { open: true, ranges: MORNING_AFTERNOON },
  5: { open: true, ranges: MORNING_AFTERNOON },
  6: { open: true, ranges: [[9 * 60, 17 * 60]] },
}

export const DEFAULT_SETTINGS = {
  salonName: '',
  pin: '1234',
  horizonDays: 30,
  bufferMin: 0,
  hours: DEFAULT_HOURS,
}

// Prestations et coiffeurs vides au départ : le commerçant les crée.
export const initialState = { settings: DEFAULT_SETTINGS, services: [], staff: [], bookings: [], myBookingIds: [] }

export const salonTitle = (settings) => settings.salonName.trim() || 'Votre salon'

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initialState
    const data = JSON.parse(raw)
    return { ...initialState, ...data, settings: { ...DEFAULT_SETTINGS, ...(data.settings || {}) } }
  } catch {
    return initialState
  }
}

export function useStore() {
  const [state, setState] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // stockage plein ou indisponible : l'application reste utilisable
    }
  }, [state])

  // Deux onglets ouverts (client + commerçant) restent synchronisés.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY) setState(load())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return [state, setState]
}
