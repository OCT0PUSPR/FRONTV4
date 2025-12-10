"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type ButtonVariant = "primary" | "secondary" | "outline"

interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  icon?: React.ElementType<{ className?: string; size?: number }>
  iconSize?: number
  iconClassName?: string
}

export function CustomButton({
  variant = "primary",
  icon: Icon,
  iconSize = 16,
  iconClassName,
  className,
  children,
  disabled,
  ...props
}: CustomButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm"

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-violet-600 text-white hover:bg-violet-700 focus:ring-violet-500 hover:shadow-md hover:-translate-y-[1px]",
    secondary:
      "bg-white text-black border border-gray-300 hover:border-gray-400 hover:shadow-md hover:-translate-y-[1px]",
    outline:
      "bg-transparent text-violet-700 border border-violet-600 hover:bg-violet-50 hover:shadow-sm",
  }

  const disabledStyles =
    disabled ? "opacity-50 cursor-not-allowed hover:shadow-none hover:translate-y-0" : ""

  return (
    <button
      className={cn(base, variants[variant], disabledStyles, className)}
      disabled={disabled}
      {...props}
    >
      {Icon ? <Icon className={cn("h-4 w-4", iconClassName)} size={iconSize} /> : null}
      {children}
    </button>
  )
}