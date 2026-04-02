import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive/10 text-destructive",
        outline: "border border-border text-muted-foreground",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        // HTTP Methods
        get: "bg-sky-500/10 text-sky-400 font-mono",
        post: "bg-emerald-500/10 text-emerald-400 font-mono",
        put: "bg-amber-500/10 text-amber-400 font-mono",
        patch: "bg-orange-500/10 text-orange-400 font-mono",
        delete: "bg-red-500/10 text-red-400 font-mono",
        // Status codes
        status2xx: "bg-emerald-500/10 text-emerald-400 font-mono",
        status3xx: "bg-amber-500/10 text-amber-400 font-mono",
        status4xx: "bg-orange-500/10 text-orange-400 font-mono",
        status5xx: "bg-red-500/10 text-red-400 font-mono",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
