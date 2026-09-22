// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  TerminalRichInputImageAttachment,
  TerminalRichInputImageAttachmentChip
} from './TerminalRichInputImageAttachment'

vi.mock('@/i18n/i18n', () => ({
  translate: (_key: string, fallback: string, options?: { value0?: string }) =>
    fallback.replace('{{value0}}', options?.value0 ?? '')
}))

const mocks = vi.hoisted(() => ({ loadLocalImageSrc: vi.fn() }))

vi.mock('@/components/editor/useLocalImageSrc', () => ({
  loadLocalImageSrc: mocks.loadLocalImageSrc
}))

beforeEach(() => {
  mocks.loadLocalImageSrc.mockResolvedValue('blob:terminal-rich-input-image')
})
afterEach(cleanup)

describe('TerminalRichInputImageAttachmentChip', () => {
  it('opens the image preview on hover', async () => {
    render(
      <TerminalRichInputImageAttachmentChip
        path="/tmp/orca-paste-123.png"
        connectionId={null}
        runtimeEnvironmentId={null}
        worktreeId="worktree-1"
        worktreePath="/repo"
        onOpen={() => {}}
        onRemove={() => {}}
      />
    )

    await userEvent.hover(screen.getByText('image.png'))

    const preview = await screen.findByText('image/png')
    const previewCard = preview.closest('[data-slot="hover-card-content"]')
    expect(previewCard?.classList.contains('w-auto')).toBe(true)
    // A raster preview needs the opaque surface, not the default frosted glass.
    expect(previewCard?.getAttribute('data-surface')).toBe('solid')
    expect(previewCard?.getAttribute('data-padding')).toBe('tight')
    expect(previewCard?.classList.contains('bg-popover')).toBe(true)
    expect(previewCard?.classList.contains('backdrop-blur-2xl')).toBe(false)
  })

  it('shows an unavailable state when the preview cannot load', async () => {
    mocks.loadLocalImageSrc.mockResolvedValue(null)
    render(
      <TerminalRichInputImageAttachmentChip
        path="/tmp/orca-paste-123.png"
        connectionId={null}
        runtimeEnvironmentId={null}
        worktreeId="worktree-1"
        worktreePath="/repo"
        onOpen={() => {}}
        onRemove={() => {}}
      />
    )

    await userEvent.hover(screen.getByText('image.png'))
    expect(await screen.findByText('Preview unavailable')).toBeTruthy()
  })

  it('falls back when the browser cannot decode the loaded image', async () => {
    render(
      <TerminalRichInputImageAttachmentChip
        path="/tmp/orca-paste-123.png"
        connectionId={null}
        runtimeEnvironmentId={null}
        worktreeId="worktree-1"
        worktreePath="/repo"
        onOpen={() => {}}
        onRemove={() => {}}
      />
    )

    await userEvent.hover(screen.getByText('image.png'))
    await waitFor(() => expect(document.querySelector('img')).not.toBeNull())
    fireEvent.error(document.querySelector('img')!)
    expect(await screen.findByText('Preview unavailable')).toBeTruthy()
  })

  it('opens in Orca and keeps removal chrome quiet until hover or focus', async () => {
    const onOpen = vi.fn()
    render(
      <TerminalRichInputImageAttachmentChip
        path="/tmp/orca-paste-123.png"
        connectionId={null}
        runtimeEnvironmentId={null}
        worktreeId="worktree-1"
        worktreePath="/repo"
        onOpen={onOpen}
        onRemove={() => {}}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Open image.png in Orca' }))
    expect(onOpen).toHaveBeenCalledOnce()
    const remove = screen.getByRole('button', { name: 'Remove image.png' })
    expect(remove.classList.contains('can-hover:opacity-0')).toBe(true)
    expect(remove.className).toContain('group-hover:opacity-100')
  })

  it('renders a compact removable pasted-image token at the editor baseline', () => {
    const html = renderToStaticMarkup(
      <TerminalRichInputImageAttachmentChip
        path="/tmp/orca-paste-123.png"
        connectionId={null}
        runtimeEnvironmentId={null}
        worktreeId="worktree-1"
        worktreePath="/repo"
        selected
        onOpen={() => {}}
        onRemove={() => {}}
      />
    )

    expect(html).toContain('image.png')
    expect(html).toContain('lucide-file-image')
    expect(html).toContain('inline-flex h-6')
    expect(html).toMatch(/<button[^>]*aria-label="Remove image\.png"/)
    expect(html).toContain('ring-1 ring-ring')
    expect(html).not.toContain('select-none')
  })

  it('copies the image as a portable file reference', () => {
    expect(
      TerminalRichInputImageAttachment.config.renderText?.call(
        // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the tiptap ReactNodeViewRenderer passes editor/extension props the component ignores.
        {} as never,
        // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the component only reads node.attrs.path off its node-view props.
        {
          node: { attrs: { path: '/tmp/design image.png' } }
        } as never
      )
    ).toBe('@"/tmp/design image.png"')
  })
})
