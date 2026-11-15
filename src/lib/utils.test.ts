import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cn, fmtPhone } from './utils'

test('cn joins class names and lets a later Tailwind class win', () => {
  assert.equal(cn('px-2', false && 'hidden', 'px-4', ['text-sm']), 'px-4 text-sm')
})

test('fmtPhone shows US 10-digit numbers one way and leaves the rest alone', () => {
  for (const p of ['5555551234', '555-555-1234', '555.555.1234', '(555) 555-1234', '+1 555 555 1234', '1-555-555-1234']) {
    assert.equal(fmtPhone(p), '(555) 555-1234', p)
  }
  for (const p of ['555-1234', '+44 20 7946 0958', '555-555-1234 ext 2', '']) assert.equal(fmtPhone(p), p, p)
})
