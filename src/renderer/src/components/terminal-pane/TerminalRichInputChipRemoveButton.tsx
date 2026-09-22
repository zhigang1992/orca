import { X } from 'lucide-react'

export function TerminalRichInputChipRemoveButton({
  label,
  onRemove
}: {
  label: string
  onRemove: () => void
}): React.JSX.Element {
  return (
    // Plain button, like the native-chat composer's own chip remove control:
    // <Button> owns shape and color, and this reveals itself on chip hover.
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
      onClick={(event) => {
        event.stopPropagation()
        onRemove()
      }}
      aria-label={label}
      className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors can-hover:pointer-events-none can-hover:absolute can-hover:left-0.5 can-hover:top-0.5 can-hover:opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 hover:text-accent-foreground"
    >
      <X className="size-3" />
    </button>
  )
}
