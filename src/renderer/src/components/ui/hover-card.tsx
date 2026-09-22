'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { HoverCard as HoverCardPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

// Why: matches the dropdown-menu recipe — translucent surface, solid
// 14% border, dual shadow, and 2xl backdrop blur. The previous
// border-border/50 + bg-popover made the hover card blend into the
// dark canvas (#171717 vs #0a0a0a, ~3% white lift) with a near-
// invisible border.
const hoverCardContentVariants = cva(
  'z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-md border text-popover-foreground outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
  {
    variants: {
      surface: {
        glass:
          'border-black/14 bg-[rgba(255,255,255,0.82)] shadow-[0_16px_36px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-2xl dark:border-white/14 dark:bg-[rgba(0,0,0,0.72)] dark:shadow-[0_20px_44px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.04)]',
        // Why: a raster preview needs an opaque backing — the glass surface lets
        // the canvas behind it tint the image and softens its edges.
        solid: 'border-border bg-popover shadow-md'
      },
      padding: {
        default: 'p-4',
        tight: 'p-2'
      }
    },
    defaultVariants: {
      surface: 'glass',
      padding: 'default'
    }
  }
)

function HoverCard({ ...props }: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />
}

function HoverCardTrigger({ ...props }: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
}

function HoverCardContent({
  className,
  align = 'center',
  sideOffset = 4,
  surface = 'glass',
  padding = 'default',
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content> &
  VariantProps<typeof hoverCardContentVariants>) {
  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        data-surface={surface}
        data-padding={padding}
        align={align}
        sideOffset={sideOffset}
        className={cn(hoverCardContentVariants({ surface, padding, className }))}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent, hoverCardContentVariants }
