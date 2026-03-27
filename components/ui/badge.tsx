import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden",
    "rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
    "transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "[&>svg]:pointer-events-none [&>svg]:size-3",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-primary/10 text-primary border-primary/20",
          "[a&]:hover:bg-primary/20",
        ].join(" "),
        secondary: [
          "bg-secondary text-secondary-foreground border-transparent",
          "[a&]:hover:bg-secondary/80",
        ].join(" "),
        destructive: [
          "bg-destructive/10 text-destructive border-destructive/20",
          "[a&]:hover:bg-destructive/20",
        ].join(" "),
        outline: [
          "border-border bg-transparent text-foreground",
          "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ].join(" "),
        ghost: [
          "border-transparent bg-transparent",
          "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ].join(" "),
        link: [
          "border-transparent text-primary underline-offset-4",
          "[a&]:hover:underline",
        ].join(" "),
        // Status variants
        success: [
          "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
          "dark:text-emerald-400 dark:bg-emerald-500/15 dark:border-emerald-500/30",
        ].join(" "),
        warning: [
          "bg-amber-500/10 text-amber-600 border-amber-500/20",
          "dark:text-amber-400 dark:bg-amber-500/15 dark:border-amber-500/30",
        ].join(" "),
        info: [
          "bg-sky-500/10 text-sky-600 border-sky-500/20",
          "dark:text-sky-400 dark:bg-sky-500/15 dark:border-sky-500/30",
        ].join(" "),
        // Solid variants
        "default-solid": [
          "bg-primary text-primary-foreground border-transparent",
          "[a&]:hover:bg-primary/90",
        ].join(" "),
        "success-solid": [
          "bg-emerald-500 text-white border-transparent",
          "[a&]:hover:bg-emerald-600",
        ].join(" "),
        "warning-solid": [
          "bg-amber-500 text-white border-transparent",
          "[a&]:hover:bg-amber-600",
        ].join(" "),
        "destructive-solid": [
          "bg-destructive text-white border-transparent",
          "[a&]:hover:bg-destructive/90",
        ].join(" "),
        "info-solid": [
          "bg-sky-500 text-white border-transparent",
          "[a&]:hover:bg-sky-600",
        ].join(" "),
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

// Dot indicator for status badges
function StatusDot({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "relative flex h-2 w-2",
        className
      )}
      {...props}
    >
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
    </span>
  )
}

export { Badge, badgeVariants, StatusDot }
