import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
  variant?: "default" | "primary" | "secondary"
  loadingText?: string
  showText?: boolean
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
}

const variantClasses = {
  default: "text-gray-400",
  primary: "text-primary",
  secondary: "text-secondary",
}

export function Spinner({
  size = "md",
  variant = "default",
  loadingText = "Loading...",
  showText = true,
  className,
  ...props
}: SpinnerProps) {
  return (
    <div
      role="status"
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      <Loader2
        className={cn(
          "animate-spin",
          sizeClasses[size],
          variantClasses[variant]
        )}
      />
      {showText && (
        <span className="text-sm text-muted-foreground">{loadingText}</span>
      )}
      <span className="sr-only">Loading</span>
    </div>
  )
} 