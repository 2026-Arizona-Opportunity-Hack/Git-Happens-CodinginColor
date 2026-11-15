import * as React from "react"
import { cn } from "@/lib/utils"

// A grey placeholder block with a shimmer; motion-reduce users get a still block.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-border/70 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-linear-to-r before:from-transparent before:via-white/70 before:to-transparent motion-reduce:before:hidden",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
