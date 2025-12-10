"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue>({
  open: false,
  setOpen: () => {},
})

const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false)

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  )
}

const DropdownMenuTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }
>(({ className, children, asChild, ...props }, ref) => {
  const { setOpen } = React.useContext(DropdownMenuContext)

  const handleClick = () => {
    setOpen(true)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: handleClick,
    })
  }

  return (
    <div ref={ref} className={cn("cursor-pointer", className)} onClick={handleClick} {...props}>
      {children}
    </div>
  )
})
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { align?: "start" | "end" | "center" }
>(({ className, children, align = "start", ...props }, ref) => {
  const { open, setOpen } = React.useContext(DropdownMenuContext)
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open, setOpen])

  if (!open) return null

  const alignmentClasses = {
    start: "left-0",
    end: "right-0",
    center: "left-1/2 -translate-x-1/2",
  }

  return (
    <div
      ref={contentRef}
      className={cn(
        "absolute z-50 mt-2 min-w-[8rem] overflow-hidden rounded-xl border bg-white p-1 shadow-lg",
        alignmentClasses[align],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
})
DropdownMenuContent.displayName = "DropdownMenuContent"

const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, onClick, ...props }, ref) => {
    const { setOpen } = React.useContext(DropdownMenuContext)

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(e)
      setOpen(false)
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-ring/70 focus-visible:ring-[3px] focus-visible:ring-[#38c3ff]",
          className,
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </div>
    )
  },
)
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("px-3 py-2 text-sm font-semibold", className)}
        {...props}
      />
    )
  }
)
DropdownMenuLabel.displayName = "DropdownMenuLabel"

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("my-1 h-px bg-border", className)}
        {...props}
      />
    )
  }
)
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator }
