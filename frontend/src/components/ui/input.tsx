import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-[13px] border border-black/[0.08] dark:border-white/[0.1] bg-[#767680]/[0.08] dark:bg-[#767680]/[0.18] px-3.5 py-2 text-[15px] md:text-[14px] text-foreground transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground placeholder:text-[#8E8E93] focus-visible:bg-white dark:focus-visible:bg-[#1C1C1E] focus-visible:border-[#007AFF] focus-visible:ring-3 focus-visible:ring-[#007AFF]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[#FF3B30] aria-invalid:ring-3 aria-invalid:ring-[#FF3B30]/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
