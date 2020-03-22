# deep-merge-changes

> Merges two or more objects, returning the same reference if the objects are equal.

This utility is helpful in situations where an object of arbitrary depth needs to be overwritten with new data. If the data in the object is the same, the original object reference is returned. When using tools that update depending on changes to immutable values (like React or Redux), this provides a performance optimization, preventing unnecessary re-renders when the selected data has not actually changed.

## Installation

```sh
# npm
npm install deep-merge-changes

# yarn
yarn add deep-merge-changes
```

## Example

```js
import assert from 'assert'
import { deepMergeChanges, OMIT } from 'deep-merge-changes'

const current = {
  a: { x: 1, y: 2, z: { w: 3 } },
  b: { x: 4, y: [5, 6, 7] },
}

const changes = {
  a: { x: 1.5, y: OMIT },
  b: { y: { 1: 6.5 } },
}

const result = deepMergeChanges(current, changes)

assert.deepStrictEqual(result, {
  a: { x: 1.5, z: { w: 3 } },
  b: { x: 4, y: [5, 6.5, 7] },
})

assert.strictEqual(result.a.z, current.a.z)
```

See [`./lib/index.spec.js`](./lib/index.spec.js) for more examples.

## Behavior

1. If the current object is shallowly equal to the result of merging the current object with the changes, the current object is returned.
1. If a property or array element in the changes is set to the `OMIT` symbol, the corresponding property or element is removed from the result.
1. If the current object is an array and the changes object is an object, the keys of the changes object represent array indexes and the values in the result array will be the current elements merged with the changes.
1. If both the current object and the changes object are arrays, the result will completely replace the current array with the changes array, unless they are equal.
1. If changes is not a plain object or array, the result is the changes value.

## Contextual examples

### Redux reducer

```js
import axios from 'axios'
import { deepMergeChanges, OMIT } from 'deep-merge-changes'
import keyBy from 'lodash.keyby'

const FETCH_MANY_COMPLETE = 'FETCH_MANY_COMPLETE'
const FETCH_COMPLETE = 'FETCH_COMPLETE'
const CREATE_COMPLETE = 'CREATE_COMPLETE'
const UPDATE_COMPLETE = 'UPDATE_COMPLETE'
const DELETE_COMPLETE = 'DELETE_COMPLETE'

const KEY = 'todos'

export const todos = (state = { byId: {}, order: [] }, action) => {
  if (action.key !== KEY) {
    return state
  }

  switch (action.type) {
    case FETCH_MANY_COMPLETE:
      const { payload: todos } = action
      
      return deepMergeChanges(state, {
        byId: keyBy(todos, todo => todo.id),
        order: todos.map(todo => todo.id),
      })
  
    case FETCH_COMPLETE:
    case CREATE_COMPLETE:
    case UPDATE_COMPLETE:
      const { payload: todo } = action
      
      return deepMergeChanges(state, {
        byId: { [todo.id]: todo },
      })
      
    case DELETE_COMPLETE:
      const { id } = action
      
      return deepMergeChanges(state, {
        byId: { [id]: OMIT },
        order: { [state[KEY].order.indexOf(id)]: OMIT },
      })
      
    default:
      return state
  }
}

export const fetchTodos = query => dispatch =>
  axios('/todos', { method: 'GET', params: query }).then(response =>
    dispatch({
      type: FETCH_MANY_COMPLETE,
      key: KEY,
      payload: response.data,
    })
  )

export const fetchTodo = id => dispatch =>
  axios(`/todos/${id}`, { method: 'GET' }).then(response =>
    dispatch({
      type: FETCH_COMPLETE,
      key: KEY,
      id,
      payload: response.data,
    })
  )

export const createTodo = data => dispatch =>
  axios('/todos', { method: 'POST', data }).then(response =>
    dispatch({
      type: CREATE_COMPLETE,
      key: KEY,
      id,
      payload: response.data,
    })
  )

export const updateTodo = (id, data) => dispatch =>
  axios(`/todos/${id}`, { method: 'PUT', data }).then(response =>
    dispatch({
      type: UPDATE_COMPLETE,
      key: KEY,
      id,
      payload: response.data,
    })
  )

export const deleteTodo = id => dispatch =>
  axios(`/todos/${id}`, { method: 'DELETE' }).then(response =>
    dispatch({
      type: DELETE_COMPLETE,
      key: KEY,
      id,
    })
  )
```

### React state example

```js
import { deepMergeChanges, OMIT } from 'deep-merge-changes'
import React, { useCallback, useMemo, useState } from 'react'

const makeId = (() => {
  let nextId = 1
  
  return () => nextId++
})()

const Todos = () => {
  const [todos, setTodos] = useState({ byId: {}, order: [] })
  
  const createTodo = useCallback(
    data => {
      const id = makeId()
    
      setTodos(todos =>
        deepMergeChanges(todos, {
          byId: {
            [id]: { ...data, id },
          },
          order: { [todos.order.length]: id },
        })
      )
    },
    [setTodos],
  )

  const updateTodo = useCallback(
    (id, data) => setTodos(todos =>
      deepMergeChanges(todos, {
        byId: { [id]: data },
      })
    ),
    [setTodos],
  )
  
  const deleteTodo = useCallback(
    id => setTodos(todos =>
      deepMergeChanges(todos, {
        byId: { [id]: OMIT },
        order: { [todos.order.indexOf(id)]: OMIT },
      }),
    ),
    [setTodos],
  )
  
  const list = useMemo(
    () => todos.order.map(id => todos.byId[id]),
    [todos.order, todos.byId],
  )
  
  return (
    <ul>
      {list.map(todo => (
        <li key={todo.id}>
          <Todo
            todo={todo}
            onUpdate={updateTodo}
            onDelete={deleteTodo}
          />
        </li>
      )}
      <li>
        <AddTodo onCreate={createTodo} />
      </li>
    </ul>
  )
}
```

## API

### `deepMergeChanges(current, ...changes): any`

|Argument|Type|Description|
|:---|:---|:---|
|`current`|`any`|The current value.|
|`changes`|`Array<any>`|The changes to merge with the current value.|

Returns the merged result.

### `OMIT`

A Symbol that signifies that the corresponding property or array index should be removed from the result if it exists.
