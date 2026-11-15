import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cn } from './utils'

test('cn joins class names and lets a later Tailwind class win', () => {
  assert.equal(cn('px-2', false && 'hidden', 'px-4', ['text-sm']), 'px-4 text-sm')
})
