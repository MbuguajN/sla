import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles
        "flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm",
        "transition-all duration-200",
        // Border and ring
        "border-input",
        "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
        // Placeholder
        "placeholder:text-muted-foreground",
        // Selection
        "selection:bg-primary/20 selection:text-foreground",
        // File input
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        // Disabled
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
        // Dark mode
        "dark:bg-input/30 dark:focus:ring-primary/30",
        // Invalid
        "aria-invalid:border-destructive aria-invalid:focus:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
