import { cn } from "@/lib/utils"

/* Shimmer skeleton: statik `animate-pulse` o'rniga chapdan o'ngga yuguradigan yorug'lik
   to'lqini (uslub globals.css dagi `.skeleton-shimmer` da). Pulse "sahifa muzlab qoldi"
   degan taassurot beradi, shimmer esa "yuklanmoqda" degan aniq signal.
   `prefers-reduced-motion` da animatsiya global qoida bilan o'chadi. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton-shimmer rounded-xl bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
