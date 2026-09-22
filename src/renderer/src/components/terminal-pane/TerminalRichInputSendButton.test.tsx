// @vitest-environment happy-dom

import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TerminalRichInputSendButton } from './TerminalRichInputSendButton'

vi.mock('@/i18n/i18n', () => ({
  translate: (_key: string, fallback: string) => fallback
}))

afterEach(cleanup)

describe('TerminalRichInputSendButton', () => {
  it('does not submit again while a send is already in flight', async () => {
    const onSend = vi.fn()
    render(
      <TooltipProvider>
        <TerminalRichInputSendButton sending disabled={false} onSend={onSend} />
      </TooltipProvider>
    )

    const button = screen.getByRole('button', { name: 'Send to terminal' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onSend).not.toHaveBeenCalled()
  })
})
