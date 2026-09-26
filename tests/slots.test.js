import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slotsForDay, pickStaff, isDayBookable } from '../src/lib/slots.js'
import { DEFAULT_SETTINGS } from '../src/lib/store.js'

// 2026-10-06 est un mardi, 2026-10-05 un lundi.
const TUE = '2026-10-06'
const MON = '2026-10-05'
const now = new Date(2026, 9, 1, 8, 0) // jeudi 1er octobre 2026, 8h
const coupe = { id: 's1', name: 'Coupe', duration: 45, price: 30 }
const couleur = { id: 's2', name: 'Couleur', duration: 90, price: 60 }
const staff = [
  { id: 'a', name: 'A', serviceIds: ['s1', 's2'] },
  { id: 'b', name: 'B', serviceIds: ['s1'] },
]
const base = { settings: DEFAULT_SETTINGS, staff, bookings: [] }
const starts = (slots) => slots.map((s) => s.start)

test('créneaux enchaînés selon la durée, dans chaque plage', () => {
  const s = slotsForDay(base, coupe, 'any', TUE, now)
  // 9h00 9h45 10h30 11h15 (12h00 dépasse), puis 14h00 … 18h15 (19h00 dépasse)
  assert.deepEqual(starts(s), [540, 585, 630, 675, 840, 885, 930, 975, 1020, 1065])
})

test('lundi fermé, dimanche fermé', () => {
  assert.equal(slotsForDay(base, coupe, 'any', MON, now).length, 0)
  assert.equal(isDayBookable(DEFAULT_SETTINGS, '2026-10-04', now), false)
})

test('horizon de 30 jours', () => {
  assert.equal(isDayBookable(DEFAULT_SETTINGS, '2026-10-31', now), true)
  assert.equal(isDayBookable(DEFAULT_SETTINGS, '2026-11-03', now), false)
})

test('coiffeur réservé = indisponible, les autres restent libres', () => {
  const bookings = [{ status: 'confirmed', staffId: 'a', date: TUE, start: 540, end: 585 }]
  const anyS = slotsForDay({ ...base, bookings }, coupe, 'any', TUE, now)
  assert.deepEqual(anyS[0].staffIds, ['b'])
  const onlyA = slotsForDay({ ...base, bookings }, coupe, 'a', TUE, now)
  assert.equal(onlyA[0].start, 585)
})

test('créneau pris par tous les coiffeurs = disparaît', () => {
  const bookings = ['a', 'b'].map((id) => ({ status: 'confirmed', staffId: id, date: TUE, start: 540, end: 585 }))
  assert.equal(slotsForDay({ ...base, bookings }, coupe, 'any', TUE, now)[0].start, 585)
})

test('rendez-vous annulé = créneau libéré', () => {
  const bookings = [{ status: 'cancelled', staffId: 'a', date: TUE, start: 540, end: 585 }]
  assert.equal(slotsForDay({ ...base, bookings }, coupe, 'a', TUE, now)[0].start, 540)
})

test('prestation réservée aux coiffeurs qui la font', () => {
  const s = slotsForDay(base, couleur, 'any', TUE, now)
  assert.ok(s.every((x) => x.staffIds.join() === 'a'))
  assert.equal(slotsForDay(base, couleur, 'b', TUE, now).length, 0)
})

test('battement entre deux rendez-vous', () => {
  const settings = { ...DEFAULT_SETTINGS, bufferMin: 15 }
  const bookings = [{ status: 'confirmed', staffId: 'a', date: TUE, start: 540, end: 585 }]
  // 9h45 serait collé au rendez-vous précédent : exclu avec 15 min de battement.
  assert.ok(!starts(slotsForDay({ settings, staff, bookings }, coupe, 'a', TUE, now)).includes(585))
})

test('délai minimum de 2 heures le jour même', () => {
  const at10 = new Date(2026, 9, 6, 10, 0) // mardi 10h
  const s = starts(slotsForDay(base, coupe, 'any', TUE, at10))
  assert.ok(s.every((m) => m >= 12 * 60))
  assert.equal(s[0], 840)
})

test('peu importe : coiffeur le moins chargé', () => {
  const bookings = [{ status: 'confirmed', staffId: 'a', date: TUE, start: 840, end: 885 }]
  assert.equal(pickStaff(['a', 'b'], bookings, TUE), 'b')
})
