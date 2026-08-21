import test from 'node:test'
import assert from 'node:assert/strict'
import { importSourceModule } from './source-module-loader.mjs'

const dates = await importSourceModule('lib/date/date-utils.js')

test('datas sem horario preservam o dia informado', () => {
  assert.equal(dates.toDateInputValue('2026-07-21'), '2026-07-21')
  assert.equal(dates.formatDateBR('2026-07-21'), '21/07/2026')
})

test('datas invalidas retornam valores seguros', () => {
  assert.equal(dates.dateOnlyToLocalDate('invalida'), null)
  assert.equal(dates.toDateInputValue('invalida'), '')
  assert.equal(dates.formatDateBR(null), '-')
})

test('timestamp local ignora horas da entrada', () => {
  const timestamp = dates.getLocalDateTime('2026-07-21')
  const localDate = new Date(timestamp)
  assert.equal(localDate.getHours(), 0)
  assert.equal(localDate.getMinutes(), 0)
})
