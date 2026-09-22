import type { PaneManager } from '@/lib/pane-manager/pane-manager'
import type { PtyTransport } from './pty-transport'
import { handleTerminalFileDrop } from './terminal-drop-handler'
import { getTerminalRichInputDropPathReceiver } from './terminal-rich-input-native-drop'
import type { NativeFileDropPayload } from '../../../../shared/native-file-drop'

/** Routes one native OS drop to the pane that received it, or to that pane's
 *  open rich-input composer. Payloads without a tab id keep the legacy
 *  active-terminal-only behavior. */
export function dispatchTerminalNativeFileDrop({
  data,
  tabId,
  isActive,
  manager,
  worktreeId,
  paneTransports,
  cwd
}: {
  data: NativeFileDropPayload
  tabId: string
  isActive: boolean
  manager: PaneManager | null
  worktreeId: string | undefined
  paneTransports: Map<number, PtyTransport>
  cwd: string | undefined
}): void {
  if (data.target !== 'terminal') {
    return
  }
  if (data.tabId ? data.tabId !== tabId : !isActive) {
    return
  }
  if (!manager || !worktreeId) {
    return
  }
  const richInputPathReceiver = getTerminalRichInputDropPathReceiver(manager, data.paneLeafId)
  richInputPathReceiver?.begin(data.paths)
  // Why Promise.resolve: the drop handler is stubbed out in tests, so the
  // returned value is not always a promise.
  const dropResult = handleTerminalFileDrop({
    manager,
    paneTransports,
    worktreeId,
    tabId,
    cwd,
    data,
    // Why: native drops still need the terminal's WSL/SSH/runtime resolver,
    // but an open composer must receive the resolved paths instead of PTY input.
    ...(richInputPathReceiver ? { onResolvedPaths: richInputPathReceiver.receive } : {})
  })
  void Promise.resolve(dropResult).finally(() => richInputPathReceiver?.end())
}
