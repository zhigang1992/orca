import { ArrowUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'

export function TerminalRichInputSendButton({
  sending,
  disabled,
  onSend
}: {
  sending: boolean
  disabled: boolean
  onSend: () => void
}): React.JSX.Element {
  const label = translate('components.terminal.richInput.send', 'Send to terminal')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="ml-auto"
          data-terminal-rich-input-send=""
          disabled={disabled || sending}
          onClick={onSend}
          aria-label={label}
        >
          {sending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ArrowUp className="size-3.5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
