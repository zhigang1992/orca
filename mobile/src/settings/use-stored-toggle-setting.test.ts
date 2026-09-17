import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { useStoredToggleSetting } from './use-stored-toggle-setting'

type Deferred<T> = {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
}

function createDeferred<T>(): Deferred<T> {
  let resolve: ((value: T) => void) | null = null
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve
  })
  if (!resolve) {
    throw new Error('deferred resolver was not initialized')
  }
  return { promise, resolve }
}

function createHarness(options: {
  readonly load: () => Promise<boolean>
  readonly save: (value: boolean) => Promise<void>
}) {
  let current: ReturnType<typeof useStoredToggleSetting> | null = null
  let renderer: ReactTestRenderer | null = null

  function Harness(): null {
    current = useStoredToggleSetting(options)
    return null
  }

  act(() => {
    renderer = create(createElement(Harness))
  })
  if (!current || !renderer) {
    throw new Error('stored toggle setting hook did not render')
  }

  return {
    get current() {
      if (!current) {
        throw new Error('stored toggle setting hook is not mounted')
      }
      return current
    },
    unmount: () => act(() => renderer?.unmount())
  }
}

describe('useStoredToggleSetting', () => {
  it('reports loading until storage answers, so no value is rendered as a guess', async () => {
    const load = createDeferred<boolean>()
    const harness = createHarness({ load: () => load.promise, save: vi.fn().mockResolvedValue() })

    expect(harness.current.setting).toEqual({ status: 'loading' })

    await act(async () => {
      load.resolve(false)
      await load.promise
    })

    expect(harness.current.setting).toEqual({ status: 'ready', value: false })
    harness.unmount()
  })

  it('keeps a toggle made before the read resolves, instead of letting the stale read win', async () => {
    const load = createDeferred<boolean>()
    const save = vi.fn().mockResolvedValue(undefined)
    const harness = createHarness({ load: () => load.promise, save })

    act(() => {
      harness.current.setValue(true)
    })
    expect(harness.current.setting).toEqual({ status: 'ready', value: true })
    expect(save).toHaveBeenCalledWith(true)

    await act(async () => {
      load.resolve(false)
      await load.promise
    })

    expect(harness.current.setting).toEqual({ status: 'ready', value: true })
    harness.unmount()
  })
})
