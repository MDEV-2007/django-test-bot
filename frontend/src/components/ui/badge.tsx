import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 text-[11px] font-semibold tracking-tight whitespace-nowrap transition-all focus-visible:ring-[3px] focus-visible:ring-[#007AFF]/35 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-[#007AFF] text-white [a]:hover:bg-[#0071EB]",
        secondary:
          "bg-[#767680]/[0.12] dark:bg-[#767680]/[0.24] text-foreground [a]:hover:bg-[#767680]/[0.18]",
        destructive:
          "bg-[#FF3B30]/12 text-[#FF3B30] border-[#FF3B30]/20",
        outline:
          "border-black/[0.08] dark:border-white/[0.12] bg-black/[0.02] dark:bg-white/[0.03] text-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-[#007AFF] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
