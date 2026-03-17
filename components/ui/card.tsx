import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-4 rounded-xl py-6 px-6 text-card-foreground",
        "bg-card border border-border/50",
        "shadow-sm hover:shadow-md",
        "transition-all duration-300 ease-out",
        "hover:border-primary/20",
        "relative overflow-hidden",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        "[.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-base font-semibold leading-tight tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center pt-4 [.border-t]:pt-6",
        className
      )}
      {...props}
    />
  )
}

// Stat Card variant for dashboard statistics
function StatCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-card"
      className={cn(
        "flex flex-col gap-3 rounded-xl p-5 text-card-foreground",
        "bg-card border border-border/50",
        "shadow-sm hover:shadow-md",
        "transition-all duration-300 ease-out",
        "hover:border-primary/20 hover:-translate-y-0.5",
        "group relative overflow-hidden",
        className
      )}
      {...props}
    />
  )
}

// Interactive Card variant for clickable items
function InteractiveCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="interactive-card"
      className={cn(
        "flex flex-col gap-4 rounded-xl py-5 px-5 text-card-foreground cursor-pointer",
        "bg-card border border-border/50",
        "shadow-sm hover:shadow-lg",
        "transition-all duration-300 ease-out",
        "hover:border-primary/30 hover:-translate-y-1",
        "active:translate-y-0 active:shadow-md",
        "group relative overflow-hidden",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  StatCard,
  InteractiveCard,
}
