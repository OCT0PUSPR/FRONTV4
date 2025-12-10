"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  TrendingUp,
  Package,
  Clock,
  ArrowRightLeft,
  CheckCircle,
  Search,
  X,
  Calendar,
  User,
  FileText,
  MapPin,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { useTheme } from "../context/theme"

interface InventoryMove {
  id: number
  reference: string
  product: string
  from: string
  to: string
  quantity: number
  status: "Done" | "In Progress" | "Pending" | "Cancelled"
  date: string
  responsible: string
  moveType: string
  priority: "High" | "Medium" | "Low"
  notes: string
}

export default function MovesAnalysisPage() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === "rtl"
  const { colors } = useTheme()
  const [searchQuery, setSearchQuery] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMove, setSelectedMove] = useState<InventoryMove | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [moveTypeFilter, setMoveTypeFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")

  // Sample moves data
  const moves: InventoryMove[] = [
    {
      id: 1,
      reference: "WH/INT/00001",
      product: "Laptop Dell XPS 15",
      from: "WH/Stock/Zone-A",
      to: "WH/Stock/Zone-B",
      quantity: 25,
      status: "Done",
      date: "2025-01-15",
      responsible: "John Smith",
      moveType: "Internal Transfer",
      priority: "Medium",
      notes: "Relocating for better space utilization",
    },
    {
      id: 2,
      reference: "WH/INT/00002",
      product: "Office Chair Ergonomic",
      from: "WH/Input",
      to: "WH/Stock/Zone-C",
      quantity: 50,
      status: "In Progress",
      date: "2025-01-16",
      responsible: "Sarah Johnson",
      moveType: "Putaway",
      priority: "High",
      notes: "New stock arrival",
    },
    {
      id: 3,
      reference: "WH/INT/00003",
      product: "Monitor 27 inch",
      from: "WH/Stock/Zone-B",
      to: "WH/Packing",
      quantity: 15,
      status: "Done",
      date: "2025-01-14",
      responsible: "Mike Davis",
      moveType: "Pick",
      priority: "High",
      notes: "Order fulfillment",
    },
    {
      id: 4,
      reference: "WH/INT/00004",
      product: "Keyboard Mechanical",
      from: "WH/Stock/Zone-A",
      to: "WH/Quality",
      quantity: 10,
      status: "Pending",
      date: "2025-01-17",
      responsible: "Emily Brown",
      moveType: "Quality Check",
      priority: "Medium",
      notes: "Routine inspection",
    },
    {
      id: 5,
      reference: "WH/INT/00005",
      product: "Mouse Wireless",
      from: "WH/Receiving",
      to: "WH/Stock/Zone-A",
      quantity: 100,
      status: "Done",
      date: "2025-01-13",
      responsible: "John Smith",
      moveType: "Putaway",
      priority: "Low",
      notes: "Standard receiving process",
    },
    {
      id: 6,
      reference: "WH/INT/00006",
      product: "Webcam HD",
      from: "WH/Stock/Zone-C",
      to: "WH/Returns",
      quantity: 5,
      status: "Cancelled",
      date: "2025-01-12",
      responsible: "Sarah Johnson",
      moveType: "Return",
      priority: "Low",
      notes: "Customer return cancelled",
    },
  ]

  const filteredMoves = moves.filter((move) => {
    const matchesSearch =
      move.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      move.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      move.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      move.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
      move.moveType.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || move.status === statusFilter
    const matchesMoveType = moveTypeFilter === "all" || move.moveType === moveTypeFilter
    const matchesLocation =
      locationFilter === "all" || move.from.includes(locationFilter) || move.to.includes(locationFilter)

    return matchesSearch && matchesStatus && matchesMoveType && matchesLocation
  })

  const totalMoves = moves.length
  const completedMoves = moves.filter((m) => m.status === "Done").length
  const inProgressMoves = moves.filter((m) => m.status === "In Progress").length
  const totalQuantity = moves.reduce((sum, m) => sum + m.quantity, 0)

  const handleCardClick = (move: InventoryMove) => {
    setSelectedMove(move)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedMove(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Done":
        return { bg: colors.pillSuccessBg, text: colors.pillSuccessText }
      case "In Progress":
        return { bg: colors.inProgress, text: colors.textPrimary }
      case "Pending":
        return { bg: colors.pillInfoBg, text: colors.pillInfoText }
      case "Cancelled":
        return { bg: colors.cancel, text: "#FFFFFF" }
      default:
        return { bg: colors.mutedBg, text: colors.textPrimary }
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return { bg: colors.cancel, text: "#FFFFFF" }
      case "Medium":
        return { bg: colors.inProgress, text: colors.textPrimary }
      case "Low":
        return { bg: colors.pillSuccessBg, text: colors.pillSuccessText }
      default:
        return { bg: colors.mutedBg, text: colors.textPrimary }
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: colors.background, padding: "2rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "700",
              color: colors.textPrimary,
              marginBottom: "0.5rem",
            }}
          >
            {t("Inventory Moves Analysis")}
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: "0.95rem" }}>
            {t("Track and analyze all inventory movements across warehouse locations")}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {[
          { label: t("Total Moves"), value: totalMoves.toString(), Icon: ArrowRightLeft, color: colors.action },
          { label: t("Completed"), value: completedMoves.toString(), Icon: CheckCircle, color: colors.success },
          { label: t("In Progress"), value: inProgressMoves.toString(), Icon: Clock, color: colors.inProgress },
          { label: t("Total Quantity"), value: totalQuantity.toString(), Icon: Package, color: colors.action },
        ].map((stat, index) => (
          <div
            key={index}
            style={{
              background: colors.card,
              padding: "1.75rem",
              borderRadius: "1rem",
              boxShadow: "0 2px 8px rgba(27, 71, 93, 0.08)",
              transition: "all 0.3s ease",
              animation: `fadeInUp 0.5s ease ${index * 0.1}s both`,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
              }}
            >
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    color: colors.textPrimary,
                    marginBottom: "0.25rem",
                  }}
                >
                  {stat.value}
                </h3>
                <p style={{ fontSize: "0.875rem", color: colors.textSecondary, fontWeight: "500" }}>
                  {stat.label}
                </p>
              </div>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "0.75rem",
                  background: stat.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <stat.Icon style={{ width: "24px", height: "24px", color: "white" }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Card style={{ padding: "1.5rem", marginBottom: "2rem", background: colors.card, border: `1px solid ${colors.border}` }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", width: "30%", minWidth: "250px" }}>
            <input
              type="text"
              placeholder={t("Search moves by reference, product, location, or type...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: isRTL ? "0.875rem 3rem 0.875rem 1rem" : "0.875rem 1rem 0.875rem 3rem",
                border: `2px solid ${colors.border}`,
                borderRadius: "0.75rem",
                fontSize: "0.95rem",
                outline: "none",
                transition: "all 0.3s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = colors.action;
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(82, 104, 237, 0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <Search
              style={{
                position: "absolute",
                [isRTL ? "right" : "left"]: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                width: "20px",
                height: "20px",
                color: colors.textSecondary,
              }}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger style={{ width: "180px" }}>
              <SelectValue placeholder={t("Status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Statuses")}</SelectItem>
              <SelectItem value="Done">{t("Done")}</SelectItem>
              <SelectItem value="In Progress">{t("In Progress")}</SelectItem>
              <SelectItem value="Pending">{t("Pending")}</SelectItem>
              <SelectItem value="Cancelled">{t("Cancelled")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={moveTypeFilter} onValueChange={setMoveTypeFilter}>
            <SelectTrigger style={{ width: "180px" }}>
              <SelectValue placeholder={t("Move Type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Types")}</SelectItem>
              <SelectItem value="Putaway">{t("Putaway")}</SelectItem>
              <SelectItem value="Pick">{t("Pick")}</SelectItem>
              <SelectItem value="Internal Transfer">{t("Internal Transfer")}</SelectItem>
              <SelectItem value="Quality Check">{t("Quality Check")}</SelectItem>
              <SelectItem value="Return">{t("Return")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger style={{ width: "180px" }}>
              <SelectValue placeholder={t("Location")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("All Locations")}</SelectItem>
              <SelectItem value="Zone-A">{t("Zone A")}</SelectItem>
              <SelectItem value="Zone-B">{t("Zone B")}</SelectItem>
              <SelectItem value="Zone-C">{t("Zone C")}</SelectItem>
              <SelectItem value="Input">{t("Input")}</SelectItem>
              <SelectItem value="Packing">{t("Packing")}</SelectItem>
              <SelectItem value="Quality">{t("Quality")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Moves Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {filteredMoves.map((move, index) => (
          <div
            key={move.id}
            onClick={() => handleCardClick(move)}
            style={{
              background: colors.card,
              borderRadius: "1rem",
              padding: "1.5rem",
              boxShadow: "0 2px 8px rgba(27, 71, 93, 0.08)",
              cursor: "pointer",
              transition: "all 0.3s ease",
              animation: `fadeInUp 0.5s ease ${index * 0.05}s both`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(27, 71, 93, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(27, 71, 93, 0.08)";
            }}
          >
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}
            >
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: "600",
                    color: colors.textPrimary,
                    marginBottom: "0.25rem",
                  }}
                >
                  {move.reference}
                </h3>
                <p style={{ fontSize: "0.875rem", color: colors.textSecondary, fontWeight: "500" }}>
                  {move.product}
                </p>
              </div>
              <span
                style={{
                  display: "inline-block",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "0.5rem",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  background: getStatusColor(move.status).bg,
                  color: getStatusColor(move.status).text,
                }}
              >
                {move.status}
              </span>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0.75rem",
                  background: colors.mutedBg,
                  color: colors.textPrimary,
                  borderRadius: "0.5rem",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                }}
              >
                <ArrowRightLeft size={14} />
                {move.moveType}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0.75rem",
                  background: getPriorityColor(move.priority).bg,
                  color: getPriorityColor(move.priority).text,
                  borderRadius: "0.5rem",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  marginLeft: "0.5rem",
                }}
              >
                <TrendingUp size={14} />
                {move.priority}
              </span>
            </div>

            <div
              style={{
                background: colors.background,
                borderRadius: "0.75rem",
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginBottom: "0.25rem" }}>
                    {t("From")}
                  </div>
                  <div style={{ fontSize: "0.875rem", fontWeight: "600", color: colors.textPrimary }}>{move.from}</div>
                </div>
                <ArrowRightLeft style={{ width: "20px", height: "20px", color: colors.textSecondary, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginBottom: "0.25rem" }}>
                    {t("To")}
                  </div>
                  <div style={{ fontSize: "0.875rem", fontWeight: "600", color: colors.textPrimary }}>{move.to}</div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginBottom: "0.25rem" }}>
                  {t("Quantity")}
                </div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: colors.action,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Package size={14} color={colors.action} />
                  {move.quantity} {t("units")}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginBottom: "0.25rem" }}>
                  {t("Date")}
                </div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: colors.textPrimary,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Calendar size={14} color={colors.textSecondary} />
                  {new Date(move.date).toLocaleDateString()}
                </div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "0.75rem", color: colors.textSecondary, marginBottom: "0.25rem" }}>
                  {t("Responsible")}
                </div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: colors.textPrimary,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <User size={14} color={colors.textSecondary} />
                  {move.responsible}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && selectedMove && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(27, 71, 93, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "2rem",
            animation: "fadeIn 0.3s ease",
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              background: colors.card,
              borderRadius: "1rem",
              maxWidth: "700px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              animation: "slideUp 0.3s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "1.5rem",
                borderBottom: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: colors.textPrimary, marginBottom: "0.25rem" }}>
                  {selectedMove.reference}
                </h2>
                <p style={{ fontSize: "0.95rem", color: colors.textSecondary }}>{selectedMove.product}</p>
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  background: colors.mutedBg,
                  border: "none",
                  cursor: "pointer",
                  padding: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "0.5rem",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = colors.border)}
                onMouseLeave={(e) => (e.currentTarget.style.background = colors.mutedBg)}
              >
                <X size={24} color={colors.textPrimary} />
              </button>
            </div>

            <div style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                      fontWeight: "500",
                    }}
                  >
                    {t("Status")}
                  </div>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.5rem 1rem",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      background: getStatusColor(selectedMove.status).bg,
                      color: getStatusColor(selectedMove.status).text,
                    }}
                  >
                    {selectedMove.status}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                      fontWeight: "500",
                    }}
                  >
                    {t("Priority")}
                  </div>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.5rem 1rem",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      background: getPriorityColor(selectedMove.priority).bg,
                      color: getPriorityColor(selectedMove.priority).text,
                    }}
                  >
                    {selectedMove.priority}
                  </span>
                </div>
              </div>

              <div
                style={{
                  background: colors.background,
                  borderRadius: "0.75rem",
                  padding: "1.5rem",
                  marginBottom: "1.5rem",
                }}
              >
                <h3 style={{ fontSize: "1rem", fontWeight: "600", color: colors.textPrimary, marginBottom: "1rem" }}>
                  {t("Movement Flow")}
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.875rem", color: colors.textSecondary, marginBottom: "0.5rem" }}>
                      {t("From Location")}
                    </div>
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: "600",
                        color: colors.textPrimary,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <MapPin size={18} color={colors.textSecondary} />
                      {selectedMove.from}
                    </div>
                  </div>
                  <ArrowRightLeft style={{ width: "28px", height: "28px", color: colors.textSecondary, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.875rem", color: colors.textSecondary, marginBottom: "0.5rem" }}>
                      {t("To Location")}
                    </div>
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: "600",
                        color: colors.textPrimary,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <MapPin size={18} color={colors.textSecondary} />
                      {selectedMove.to}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                <div>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                      fontWeight: "500",
                    }}
                  >
                    {t("Move Type")}
                  </div>
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <ArrowRightLeft size={18} color={colors.textSecondary} />
                    {selectedMove.moveType}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                      fontWeight: "500",
                    }}
                  >
                    {t("Quantity")}
                  </div>
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Package size={18} color={colors.textSecondary} />
                    {selectedMove.quantity} {t("units")}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                      fontWeight: "500",
                    }}
                  >
                    {t("Date")}
                  </div>
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Calendar size={18} color={colors.textSecondary} />
                    {new Date(selectedMove.date).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: colors.textSecondary,
                      marginBottom: "0.5rem",
                      fontWeight: "500",
                    }}
                  >
                    {t("Responsible")}
                  </div>
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: "600",
                      color: colors.textPrimary,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <User size={18} color={colors.textSecondary} />
                    {selectedMove.responsible}
                  </div>
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: colors.textSecondary,
                    marginBottom: "0.5rem",
                  }}
                >
                  {t("Notes")}
                </div>
                <div
                  style={{
                    background: colors.background,
                    padding: "1rem",
                    borderRadius: "0.5rem",
                    fontSize: "0.95rem",
                    color: colors.textPrimary,
                    display: "flex",
                    alignItems: "start",
                    gap: "0.5rem",
                  }}
                >
                  <FileText size={18} color={colors.textSecondary} style={{ flexShrink: 0, marginTop: "0.125rem" }} />
                  {selectedMove.notes}
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "1.5rem",
                borderTop: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "flex-end",
                gap: "1rem",
              }}
            >
              <button
                onClick={handleCloseModal}
                style={{
                  padding: "0.75rem 1.5rem",
                  border: "none",
                  background: colors.cancel,
                  color: "#FFFFFF",
                  borderRadius: "0.5rem",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                {t("Cancel")}
              </button>
              <button
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: colors.action,
                  color: "#FFFFFF",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                {t("Close")}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
