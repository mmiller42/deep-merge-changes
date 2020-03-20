import test from 'ava'
import { cloneDeep, isPlainObject, uniq } from 'lodash'
import { deepMergeChanges, OMIT } from './index.js'

const getChangedPaths = (a, b, path = []) => {
  if (Object.is(a, b)) {
    return []
  }

  if (
    (isPlainObject(a) && isPlainObject(b)) ||
    (Array.isArray(a) && Array.isArray(b))
  ) {
    const keys = uniq([...Object.keys(a), ...Object.keys(b)])

    return [
      path,
      ...keys.flatMap(
        key => getChangedPaths(a[key], b[key], [...path, key]),
        [],
      ),
    ]
  }

  return [path]
}

test('returns the same object if unchanged', t => {
  const current = { x: 1, y: 2 }
  const changes = { y: 2 }

  const currentClone = cloneDeep(current)
  const changesClone = cloneDeep(changes)
  const merged = deepMergeChanges(current, changes)

  t.deepEqual(current, currentClone)
  t.deepEqual(changes, changesClone)
  t.is(merged, current)
})

test('removes properties', t => {
  const current = { x: 1, y: 1, z: 1 }
  const changes = { y: OMIT }

  const currentClone = cloneDeep(current)
  const changesClone = cloneDeep(changes)
  const merged = deepMergeChanges(current, changes)

  t.deepEqual(current, currentClone)
  t.deepEqual(changes, changesClone)
  t.deepEqual(merged, { x: 1, z: 1 })

  t.deepEqual(getChangedPaths(current, merged), [[], ['y']])
})

test('replaces primitives', t => {
  const current = { x: 1, y: 1, z: 1 }
  const changes = { z: 2 }

  const currentClone = cloneDeep(current)
  const changesClone = cloneDeep(changes)
  const merged = deepMergeChanges(current, changes)

  t.deepEqual(current, currentClone)
  t.deepEqual(changes, changesClone)
  t.deepEqual(merged, { x: 1, y: 1, z: 2 })

  t.deepEqual(getChangedPaths(current, merged), [[], ['z']])
})

test('replaces arrays', t => {
  const current = { x: 1, y: [1, 2, 3], z: 1 }
  const changes = { y: [4] }

  const currentClone = cloneDeep(current)
  const changesClone = cloneDeep(changes)
  const merged = deepMergeChanges(current, changes)

  t.deepEqual(current, currentClone)
  t.deepEqual(changes, changesClone)
  t.deepEqual(merged, { x: 1, y: [4], z: 1 })

  t.deepEqual(getChangedPaths(current, merged), [
    [],
    ['y'],
    ['y', '0'],
    ['y', '1'],
    ['y', '2'],
  ])
})

test('replaces array values', t => {
  const current = { x: 1, y: [1, 2, 3], z: 1 }
  const changes = { y: { 0: 4 } }

  const currentClone = cloneDeep(current)
  const changesClone = cloneDeep(changes)
  const merged = deepMergeChanges(current, changes)

  t.deepEqual(current, currentClone)
  t.deepEqual(changes, changesClone)
  t.deepEqual(merged, { x: 1, y: [4, 2, 3], z: 1 })

  t.deepEqual(getChangedPaths(current, merged), [[], ['y'], ['y', '0']])
})

test('removes array values', t => {
  const current = { x: 1, y: [1, 2, 3], z: 1 }
  const changes = { y: { 1: OMIT } }

  const currentClone = cloneDeep(current)
  const changesClone = cloneDeep(changes)
  const merged = deepMergeChanges(current, changes)

  t.deepEqual(current, currentClone)
  t.deepEqual(changes, changesClone)
  t.deepEqual(merged, { x: 1, y: [1, 3], z: 1 })

  t.deepEqual(getChangedPaths(current, merged), [
    [],
    ['y'],
    ['y', '1'],
    ['y', '2'],
  ])
})

test('deeply sets nested objects', t => {
  const current = {
    x: {
      a: { x: 1, y: 1 },
      b: {
        x: 1,
        y: [
          { f: 1, g: 2, h: [] },
          { f: 3, g: 4, h: [5, 6] },
        ],
      },
      c: {},
    },
    y: [1, 2, 3],
    z: [{ a: 1 }, { a: 1 }],
  }

  const changes = {
    x: {
      a: { foo: 'bar', y: OMIT },
      b: {
        y: {
          1: { f: 4 },
          2: { f: 5, g: 6, h: [] },
        },
      },
    },
    y: {
      1: 2,
    },
    z: [{ a: 1 }, { a: 1 }],
  }

  const currentClone = cloneDeep(current)
  const changesClone = cloneDeep(changes)
  const merged = deepMergeChanges(current, changes)

  t.deepEqual(current, currentClone)
  t.deepEqual(changes, changesClone)
  t.deepEqual(merged, {
    x: {
      a: { x: 1, foo: 'bar' },
      b: {
        x: 1,
        y: [
          { f: 1, g: 2, h: [] },
          { f: 4, g: 4, h: [5, 6] },
          { f: 5, g: 6, h: [] },
        ],
      },
      c: {},
    },
    y: [1, 2, 3],
    z: [{ a: 1 }, { a: 1 }],
  })

  t.deepEqual(getChangedPaths(current, merged), [
    [],
    ['x'],
    ['x', 'a'],
    ['x', 'a', 'y'],
    ['x', 'a', 'foo'],
    ['x', 'b'],
    ['x', 'b', 'y'],
    ['x', 'b', 'y', '1'],
    ['x', 'b', 'y', '1', 'f'],
    ['x', 'b', 'y', '2'],
  ])
})
