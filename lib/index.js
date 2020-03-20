const shallowEqual = (current, next) => {
  const currentKeys = Object.keys(current)
  return (
    currentKeys.length === Object.keys(next).length &&
    currentKeys.every(key => current[key] === next[key])
  )
}

const mapValues = (collection, callback) =>
  Object.keys(collection).reduce((acc, key) => {
    acc[key] = callback(collection[key], key, collection)
    return acc
  }, {})

const pickBy = (collection, predicate) =>
  Object.keys(collection).reduce((acc, key) => {
    if (predicate(collection[key], key, collection)) {
      acc[key] = collection[key]
    }

    return acc
  }, {})

const isCollection = value =>
  value &&
  typeof value === 'object' &&
  (value.constructor === Object ||
    value.constructor === null ||
    Array.isArray(value))

const filter = (collection, predicate) =>
  Array.isArray(collection)
    ? collection.filter(predicate)
    : pickBy(collection, predicate)

export const OMIT = Symbol('OMIT')

export const deepMergeChanges = (current, ...changes) =>
  changes.reduce((current, next) => {
    if (isCollection(current) && isCollection(next)) {
      let filteredCurrent = filter(current, (value, key) => next[key] !== OMIT)
      const filteredNext = pickBy(next, value => value !== OMIT)

      if (Array.isArray(current) && Array.isArray(next)) {
        filteredCurrent = filteredCurrent.slice(
          0,
          Math.max(...Object.keys(filteredNext)),
        )
      }

      const merged = Object.assign(
        filteredCurrent,
        mapValues(filteredNext, (value, key) =>
          deepMergeChanges(current[key], value),
        ),
      )

      return shallowEqual(current, merged) ? current : merged
    }

    return next
  }, current)
