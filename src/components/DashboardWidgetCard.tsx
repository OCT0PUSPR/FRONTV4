import React from "react"
import { Card as MuiCard, CardContent, Box, Typography, Chip, IconButton } from "@mui/material"
import DeleteIcon from "@mui/icons-material/Delete"

type Props = {
  title: string
  themeName: string
  colors: {
    card: string
    border: string
    textPrimary: string
    textSecondary: string
    mutedBg: string
    action: string
    background: string
  }
  maxCardHeight: number
  onDelete?: () => void
  children: React.ReactNode
}

export function DashboardWidgetCard({ title, themeName, colors, maxCardHeight, onDelete, children }: Props) {
  return (
    <MuiCard
      sx={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 2,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        height: "100%",
        maxHeight: maxCardHeight,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            pb: 1.5,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <Typography variant="h6" fontWeight={600} color={colors.textPrimary}>
            {title}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={themeName || "Default"}
              size="small"
              sx={{
                bgcolor: colors.mutedBg,
                color: colors.textSecondary,
                fontWeight: 500,
              }}
            />
            {onDelete && (
              <IconButton
                size="small"
                onClick={onDelete}
                sx={{
                  color: colors.textSecondary,
                  "&:hover": { color: colors.action },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
        <Box sx={{ flexGrow: 1, overflow: "hidden" }}>{children}</Box>
      </CardContent>
    </MuiCard>
  )
}
