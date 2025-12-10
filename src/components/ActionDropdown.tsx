  "use client"

  import { useState, useRef, useEffect, ReactNode, CSSProperties } from "react"
  import { createPortal } from "react-dom"
  import { ChevronDown, MoreVertical, LucideIcon } from "lucide-react"
  import { useTheme } from "../../context/theme"

  interface ActionItem {
    key: string
    label: string
    icon?: LucideIcon
    onClick: () => void
    danger?: boolean
    disabled?: boolean
  }

  interface ActionDropdownProps {
    actions: ActionItem[]
    label?: string
    icon?: LucideIcon
    iconOnly?: boolean
    disabled?: boolean
    placement?: "bottom" | "top"
    align?: "left" | "center" | "right"
  }

  export function ActionDropdown({
    actions = [],
    label,
    icon: Icon,
    iconOnly = false,
    disabled = false,
    placement = "bottom",
    align = "right",
  }: ActionDropdownProps) {
    const { colors } = useTheme()
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node
        if (
          dropdownRef.current && 
          !dropdownRef.current.contains(target) &&
          menuRef.current &&
          !menuRef.current.contains(target) &&
          buttonRef.current &&
          !buttonRef.current.contains(target)
        ) {
          setIsOpen(false)
        }
      }

      const handleScroll = () => {
        setIsOpen(false)
      }

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside)
        window.addEventListener("scroll", handleScroll, true)
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside)
        window.removeEventListener("scroll", handleScroll, true)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
      }
    }, [isOpen])

    const filteredActions = (actions || []).filter((action) => action !== null && action !== undefined)

    if (filteredActions.length === 0) {
      return null
    }

    const handleMouseLeave = () => {
      // Add a small delay before closing to allow moving to dropdown
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false)
      }, 150)
    }

    const handleMouseEnter = () => {
      // Cancel any pending close
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (!disabled) {
        setIsOpen(true)
      }
    }

    // Calculate position for portal-based dropdown
    const getMenuPosition = (): CSSProperties => {
      if (!buttonRef.current) {
        return { position: 'fixed' as const, zIndex: 10000 }
      }

      const rect = buttonRef.current.getBoundingClientRect()

      const baseStyles: CSSProperties = {
        position: 'fixed',
        zIndex: 10000,
      }

      // Calculate horizontal position based on align
      switch (align) {
        case "left":
          baseStyles.left = rect.left
          break
        case "center":
          baseStyles.left = rect.left + (rect.width / 2)
          baseStyles.transform = "translateX(-50%)"
          break
        case "right":
        default:
          baseStyles.right = window.innerWidth - rect.right
          break
      }

      // Calculate vertical position based on placement
      if (placement === "bottom") {
        baseStyles.top = rect.bottom + 2
      } else {
        baseStyles.bottom = window.innerHeight - rect.top + 2
      }

      return baseStyles
    }

    return (
      <div
        ref={dropdownRef}
        style={{ position: "relative", display: "inline-block" }}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 0, border: `1px solid ${colors.border}`, borderRadius: "6px", background: colors.card }}>
          {/* Label section */}
          {label && (
            <div
              style={{
                padding: "0.375rem 0.75rem",
                fontSize: 12,
                fontWeight: 500,
                color: colors.textPrimary,
                display: "flex",
                alignItems: "center",
                borderRight: `1px solid ${colors.border}`,
              }}
            >
              {label}
            </div>
          )}
          {/* Icon/Chevron section */}
          <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            onMouseEnter={handleMouseEnter}
            disabled={disabled}
            style={{
              background: "transparent",
              color: colors.textPrimary,
              border: "none",
              padding: "0.375rem 0.5rem",
              borderRadius: label ? "0 6px 6px 0" : "6px",
              cursor: disabled ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              opacity: disabled ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {Icon ? (
              <Icon size={14} />
            ) : (
              <MoreVertical size={14} />
            )}
          </button>
        </div>

        {isOpen && filteredActions.length > 0 && typeof document !== 'undefined' && createPortal(
          <div
            ref={menuRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              ...getMenuPosition(),
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 6,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              minWidth: "140px",
              overflow: "hidden",
            }}
          >
            {filteredActions.map((action) => {
              const ActionIcon = action.icon
              const isDanger = action.danger
              return (
                <div
                  key={action.key}
                  style={{
                    padding: "0.25rem 0.25rem",
                  }}
                >
                  <button
                    onClick={() => {
                      if (!action.disabled) {
                        action.onClick()
                        setIsOpen(false)
                      }
                    }}
                    disabled={action.disabled}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "none",
                      background: "transparent",
                      color: action.disabled
                        ? colors.textSecondary
                        : isDanger
                          ? "#FF0000"
                          : colors.textPrimary,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: action.disabled ? "not-allowed" : "pointer",
                      textAlign: "left",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      opacity: action.disabled ? 0.5 : 1,
                      borderRadius: "4px",
                    }}
                    onMouseEnter={(e) => {
                      if (!action.disabled) {
                        if (isDanger) {
                          e.currentTarget.style.background = "#FF0000"
                          e.currentTarget.style.color = "#FFFFFF"
                        } else {
                          e.currentTarget.style.background = colors.mutedBg
                          e.currentTarget.style.color = colors.textPrimary
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!action.disabled) {
                        e.currentTarget.style.background = "transparent"
                        e.currentTarget.style.color = isDanger ? "#FF0000" : colors.textPrimary
                      }
                    }}
                  >
                    {ActionIcon && <ActionIcon size={12} />}
                    {action.label}
                  </button>
                </div>
              )
            })}
          </div>,
          document.body
        )}
      </div>
    )
  }

