import type { ConnectionState } from '../transport/types'

type MobileTerminalInputGateOptions = {
  readonly connState: ConnectionState
  readonly activeHandle: string | null
  readonly activeSessionTabType: string | null | undefined
}

type MobileTerminalInputGate = {
  // Why: composing is local — it must survive an outage so typed text is held, not discarded (#6713).
  readonly canCompose: boolean
  // Why: the live capture has nowhere to put keystrokes offline, so it stays
  // connection-gated — but a handle that has not caught up is not an outage,
  // and losing `editable` there closes the keyboard for no reason.
  readonly canHoldLiveKeyboard: boolean
  readonly canSend: boolean
}

export function resolveMobileTerminalInputGate({
  connState,
  activeHandle,
  activeSessionTabType
}: MobileTerminalInputGateOptions): MobileTerminalInputGate {
  // Why: a lagging session-tab snapshot can publish a terminal tab whose handle
  // is briefly absent (see applySessionTabs). Dropping canCompose there set
  // editable={false} on the focused field, which resigns first responder and
  // closes the keyboard mid-typing or mid-dictation. A terminal tab is still a
  // composing surface while its handle catches up; sends stay gated on the
  // handle itself.
  const hasComposingSurface = activeHandle != null || activeSessionTabType === 'terminal'
  const canCompose =
    hasComposingSurface &&
    activeSessionTabType !== 'markdown' &&
    activeSessionTabType !== 'file' &&
    activeSessionTabType !== 'browser'
  const connected = connState === 'connected'
  return {
    canCompose,
    canHoldLiveKeyboard: canCompose && connected,
    canSend: canCompose && activeHandle != null && connected
  }
}
