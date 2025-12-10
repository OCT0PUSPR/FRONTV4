
import * as React from "react"

import { useTheme } from "../../../context/theme"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    const { colors } = useTheme()
    const [isFocused, setIsFocused] = React.useState(false)
    const hasValue = typeof props.value === "string" ? props.value.length > 0 : false

    return (
      <textarea
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          width: "100%",
          padding: "10px 10px",
          background: colors.card,
          border: `2px solid ${isFocused || hasValue ? colors.border : colors.border}`,
          borderRadius: "0.75rem",
          fontSize: "12px",
          color: colors.textPrimary,
          outline: "none",
          transition: "all 0.2s ease",
          fontWeight: hasValue ? "500" : "400",
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLTextAreaElement>) => {
          if (!isFocused && !hasValue) {
            e.currentTarget.style.borderColor = colors.action
          }
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLTextAreaElement>) => {
          if (!isFocused && !hasValue) {
            e.currentTarget.style.borderColor = colors.border
          }
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
