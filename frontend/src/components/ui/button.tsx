import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[14px] border border-transparent bg-clip-padding text-[14px] font-semibold tracking-tight whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:ring-3 focus-visible:ring-[#007AFF]/35 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#007AFF] text-white hover:bg-[#0071EB] shadow-[0_4px_14px_-2px_rgba(0,122,255,0.35)]",
        outline:
          "border border-black/[0.08] dark:border-white/[0.12] bg-white/80 dark:bg-[#2C2C2E]/80 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-foreground backdrop-blur-md shadow-2xs",
        secondary:
          "bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] text-foreground hover:bg-[#767680]/[0.18] dark:hover:bg-[#767680]/[0.32]",
        ghost:
          "hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-foreground",
        destructive:
          "bg-[#FF3B30] text-white hover:bg-[#E0352B] shadow-[0_4px_14px_-2px_rgba(255,59,48,0.35)] font-semibold",
        link: "text-[#007AFF] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        xs: "h-7 gap-1 rounded-[10px] px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-[12px] px-3.5 text-[13px] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 rounded-[16px] px-6 text-[15px]",
        icon: "size-10 rounded-[13px]",
        "icon-xs": "size-7 rounded-[9px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-[11px]",
        "icon-lg": "size-12 rounded-[16px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
