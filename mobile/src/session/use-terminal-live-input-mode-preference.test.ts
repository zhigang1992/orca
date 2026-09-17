import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadTerminalDefaultInputMode,
  readDisabledTerminalLiveInputHandlesPreference,
  saveDisabledTerminalLiveInputHandles,
  type DisabledTerminalLiveInputHandlesPreference
} from '../storage/preferences'
import { useTerminalLiveInputModePreference } from './use-terminal-live-input-mode-preference'

vi.mock('../storage/preferences', () => ({
  loadTerminalDefaultInputMode: vi.fn(async () => 'live'),
  readDisabledTerminalLiveInputHandlesPreference: vi.fn(),
  saveDisabledTerminalLiveInputHandles: vi.fn()
}))

type TerminalLiveInputModePreferenceHarness = {
  readonly current: ReturnType<typeof useTerminalLiveInputModePreference>
  readonly unmount: () => void
}

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

function createTerminalLiveInputModePreferenceHarness(): TerminalLiveInputModePreferenceHarness {
  let current: ReturnType<typeof useTerminalLiveInputModePreference> | null = null
  let renderer: ReactTestRenderer | null = null

  function Harness(): null {
    current = useTerminalLiveInputModePreference({
      hostId: 'host-1',
      worktreeId: 'worktree-1'
    })
    return null
  }

  act(() => {
    renderer = create(createElement(Harness))
  })
  if (!current || !renderer) {
    throw new Error('terminal live input mode preference hook did not render')
  }

  return {
    get current() {
      if (!current) {
        throw new Error('terminal live input mode preference hook is not mounted')
      }
      return current
    },
    unmount: () => {
      act(() => renderer?.unmount())
    }
  }
}

describe('terminal live input mode preference hook', () => {
  beforeEach(() => {
    vi.mocked(readDisabledTerminalLiveInputHandlesPreference).mockReset()
    vi.mocked(saveDisabledTerminalLiveInputHandles).mockReset()
    vi.mocked(saveDisabledTerminalLiveInputHandles).mockResolvedValue()
    vi.mocked(loadTerminalDefaultInputMode).mockReset()
    vi.mocked(loadTerminalDefaultInputMode).mockResolvedValue('live')
  })

  it('merges pre-hydration edits with loaded disabled handles', async () => {
    const load = createDeferred<DisabledTerminalLiveInputHandlesPreference>()
    vi.mocked(readDisabledTerminalLiveInputHandlesPreference).mockReturnValue(load.promise)
    const harness = createTerminalLiveInputModePreferenceHarness()

    act(() => {
      harness.current.defaultTerminalHandlesToLiveInput(['pty-1', 'pty-2'])
    })
    act(() => {
      expect(harness.current.toggleTerminalLiveInput('pty-1')).toBe(true)
    })

    await act(async () => {
      load.resolve({ handles: new Set(['pty-2']), loaded: true })
      await load.promise
    })

    expect([...harness.current.liveInputTerminalHandles]).toEqual(['pty-1'])
    expect(saveDisabledTerminalLiveInputHandles).toHaveBeenCalledTimes(1)
    expect(saveDisabledTerminalLiveInputHandles).toHaveBeenCalledWith(
      'host-1',
      'worktree-1',
      new Set(['pty-2'])
    )
    harness.unmount()
  })

  it('does not persist fallback-empty storage reads during clean hydration', async () => {
    const load = createDeferred<DisabledTerminalLiveInputHandlesPreference>()
    vi.mocked(readDisabledTerminalLiveInputHandlesPreference).mockReturnValue(load.promise)
    const harness = createTerminalLiveInputModePreferenceHarness()

    act(() => {
      harness.current.defaultTerminalHandlesToLiveInput(['pty-1'])
    })

    await act(async () => {
      load.resolve({ handles: new Set(), loaded: false })
      await load.promise
    })

    expect([...harness.current.liveInputTerminalHandles]).toEqual(['pty-1'])
    expect(saveDisabledTerminalLiveInputHandles).not.toHaveBeenCalled()
    harness.unmount()
  })

  it('leaves first-seen handles buffered when the device default is the command box', async () => {
    const load = createDeferred<DisabledTerminalLiveInputHandlesPreference>()
    vi.mocked(readDisabledTerminalLiveInputHandlesPreference).mockReturnValue(load.promise)
    vi.mocked(loadTerminalDefaultInputMode).mockResolvedValue('buffered')
    const harness = createTerminalLiveInputModePreferenceHarness()

    act(() => {
      harness.current.defaultTerminalHandlesToLiveInput(['pty-1'])
    })
    await act(async () => {
      load.resolve({ handles: new Set(), loaded: true })
      await load.promise
    })

    expect([...harness.current.liveInputTerminalHandles]).toEqual([])

    // The handle is still marked defaulted, so a later tab refresh cannot retry
    // the default and flip it to live behind the user.
    act(() => {
      harness.current.defaultTerminalHandlesToLiveInput(['pty-1'])
    })
    expect([...harness.current.liveInputTerminalHandles]).toEqual([])

    // An explicit toggle still wins over the device default.
    act(() => {
      expect(harness.current.toggleTerminalLiveInput('pty-1')).toBe(true)
    })
    expect([...harness.current.liveInputTerminalHandles]).toEqual(['pty-1'])
    harness.unmount()
  })

  it('applies a default-mode change to handles seen after the refresh', async () => {
    vi.mocked(readDisabledTerminalLiveInputHandlesPreference).mockResolvedValue({
      handles: new Set(),
      loaded: true
    })
    const harness = createTerminalLiveInputModePreferenceHarness()
    await act(async () => {})

    act(() => {
      harness.current.defaultTerminalHandlesToLiveInput(['pty-1'])
    })
    expect([...harness.current.liveInputTerminalHandles]).toEqual(['pty-1'])

    vi.mocked(loadTerminalDefaultInputMode).mockResolvedValue('buffered')
    await act(async () => {
      await harness.current.refreshTerminalDefaultInputMode()
    })

    act(() => {
      harness.current.defaultTerminalHandlesToLiveInput(['pty-2'])
    })
    expect([...harness.current.liveInputTerminalHandles]).toEqual(['pty-1'])
    harness.unmount()
  })
})
