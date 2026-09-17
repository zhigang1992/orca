import { useSyncExternalStore } from 'react'

/** The hidden live-capture field's text, held outside React state.
 *
 *  Why: the capture used to be `useState` on the session screen, so every
 *  keystroke re-rendered the whole surface — header, tab strip, terminal
 *  WebView host and sheets — to update a 1×1 invisible input. Only the command
 *  dock reads this value, so it subscribes and nothing above it re-renders. */
export type TerminalLiveInputCaptureStore = {
  readonly getSnapshot: () => string
  readonly setText: (text: string) => void
  readonly subscribe: (listener: () => void) => () => void
}

export function createTerminalLiveInputCaptureStore(): TerminalLiveInputCaptureStore {
  let text = ''
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => text,
    setText: (next: string) => {
      if (next === text) {
        return
      }
      text = next
      for (const listener of listeners) {
        listener()
      }
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}

export function useTerminalLiveInputCapture(store: TerminalLiveInputCaptureStore): string {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
