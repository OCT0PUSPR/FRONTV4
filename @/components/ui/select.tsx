"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { IOSCheckbox } from "../../../src/components/IOSCheckbox"
import { useTheme } from "../../../context/theme"
import { useTranslation } from "react-i18next"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const { colors } = useTheme()
  const { i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex w-full items-center text-sm transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className,
      )}
      style={{
        height: "44px",
        borderRadius: "8px",
        border: `2px solid ${colors.border}`,
        background: colors.card,
        color: colors.textPrimary,
        padding: "8px 12px",
        justifyContent: "space-between",
        flexDirection: isRTL ? "row-reverse" : "row",
      }}
      onFocus={(e) => {
        if (!props.disabled) {
          e.currentTarget.style.borderColor = "#4facfe"
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79, 172, 254, 0.15)"
        }
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = colors.border
        e.currentTarget.style.boxShadow = "none"
      }}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4" style={{ opacity: 0.5, color: colors.textSecondary, flexShrink: 0 }} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
})
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => {
  const { colors } = useTheme()
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        style={{
          background: colors.card,
          color: colors.textPrimary,
          border: `1px solid ${colors.border}`,
        }}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
})
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label ref={ref} className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)} {...props} />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => {
  const { colors } = useTheme()
  const { i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pr-2 text-sm outline-none",
        className,
      )}
      style={{
        color: colors.textPrimary,
        paddingLeft: isRTL ? "0.5rem" : "2rem",
        paddingRight: isRTL ? "2rem" : "0.5rem",
        flexDirection: isRTL ? "row-reverse" : "row",
      }}
      onFocus={(e) => {
        e.currentTarget.style.background = colors.mutedBg
      }}
      onBlur={(e) => {
        e.currentTarget.style.background = "transparent"
      }}
      {...props}
    >
      <span
        className="absolute flex h-3.5 w-3.5 items-center justify-center"
        style={{
          [isRTL ? 'right' : 'left']: "0.5rem",
        }}
      >
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" style={{ color: colors.action }} />
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText style={{ textAlign: isRTL ? "right" : "left" }}>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
})
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export type SelectOption = { label: string; value: string }

type SingleSelectConfig = {
  mode?: "single"
  value: string
  onChange: (value: string) => void
}

type MultiSelectConfig = {
  mode: "multiple"
  value: string[]
  onChange: (value: string[]) => void
}

type SharedSelectProps = {
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
  emptyLabel?: string
}

export type EnhancedSelectProps = SharedSelectProps & (SingleSelectConfig | MultiSelectConfig)

function MultiSelect({
  options,
  placeholder,
  value,
  onChange,
  className,
  disabled,
}: SharedSelectProps & Omit<MultiSelectConfig, "mode">) {
  const { colors } = useTheme()
  const { t, i18n } = useTranslation()
  const isRTL = i18n?.dir() === "rtl"
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const selectedLabels = React.useMemo(
    () => options.filter((option) => value.includes(option.value)).map((option) => option.label),
    [options, value],
  )

  const displayText =
    selectedLabels.length === 0
      ? placeholder ?? t("Select")
      : selectedLabels.length <= 2
        ? selectedLabels.join(isRTL ? "، " : ", ")
        : `${selectedLabels.length} ${t("selected")}`

  const toggleValue = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((item) => item !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const clearSelection = () => {
    onChange([])
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: "flex",
          height: "44px",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          flexDirection: isRTL ? "row-reverse" : "row",
          borderRadius: "8px",
          border: `2px solid ${colors.border}`,
          background: colors.card,
          padding: "8px 12px",
          fontSize: "0.875rem",
          color: selectedLabels.length === 0 ? colors.textSecondary : colors.textPrimary,
          transition: "all 0.2s",
          outline: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
        onFocus={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = "#4facfe"
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79, 172, 254, 0.15)"
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = colors.border
          e.currentTarget.style.boxShadow = "none"
        }}
      >
        <span className="line-clamp-1" style={{ textAlign: isRTL ? "right" : "left", flex: 1 }}>{displayText}</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", {
            "rotate-180": open,
          })}
          style={{ opacity: 0.5, color: colors.textSecondary, flexShrink: 0 }}
        />
      </button>

      {open && !disabled && (
        <div
          className="absolute z-50 mt-2 w-full rounded-md shadow-lg"
          style={{
            border: `1px solid ${colors.border}`,
            background: colors.card,
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            [isRTL ? 'right' : 'left']: 0,
          }}
        >
          <div className="max-h-60 overflow-auto px-2 py-2" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
            {value.length > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                style={{
                  marginBottom: "0.5rem",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: colors.action,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "none",
                  width: "100%",
                  textAlign: isRTL ? "right" : "left",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = "underline"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = "none"
                }}
              >
                {placeholder ? `${placeholder} - ` : ""}{t("Clear Selection")}
              </button>
            )}
            {options.length === 0 && (
              <div className="px-2 py-3 text-sm" style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}>{t("No options")}</div>
            )}
            {options.map((option) => (
              <div
                key={option.value}
                className="flex items-center gap-2 rounded-md px-2 py-1.5"
                style={{
                  cursor: "pointer",
                  flexDirection: isRTL ? "row-reverse" : "row",
                  textAlign: isRTL ? "right" : "left",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.mutedBg
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent"
                }}
              >
                <IOSCheckbox
                  checked={value.includes(option.value)}
                  onChange={() => toggleValue(option.value)}
                  label={option.label}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function EnhancedSelect(props: EnhancedSelectProps) {
  if (props.mode === "multiple") {
    return (
      <MultiSelect
        options={props.options}
        placeholder={props.placeholder}
        value={props.value}
        onChange={props.onChange}
        className={props.className}
        disabled={props.disabled}
      />
    )
  }

  return (
    <Select
      disabled={props.disabled}
      value={props.value}
      onValueChange={(val) => props.onChange(val)}
    >
      <SelectTrigger className={props.className}>
        <SelectValue placeholder={props.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {props.options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
