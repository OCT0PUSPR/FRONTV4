/**
 * Constants for Smart Reports Builder
 *
 * This file contains all constant values used throughout the Smart Reports Builder,
 * including A4 dimensions, section type configurations, fonts, and more.
 */

import {
  FileText,
  Building2,
  Type,
  Table,
  Package,
  Signature,
  Hash,
  Minus,
  Square,
  Image as ImageIcon,
} from "lucide-react"
import { SectionType } from "./types"

// =============================================================================
// A4 DIMENSIONS
// =============================================================================

/** A4 width in pixels (at 96 DPI) */
export const A4_WIDTH = 794

/** A4 height in pixels (at 96 DPI) */
export const A4_HEIGHT = 1123

// =============================================================================
// SECTION TYPE CONFIGURATIONS
// =============================================================================

/** Configuration for each section type including icon, label, and description */
export const SECTION_TYPES: Record<
  SectionType,
  { icon: any; label: string; description: string }
> = {
  header: {
    icon: FileText,
    label: "Header",
    description: "Document header with title & company info",
  },
  company: {
    icon: Building2,
    label: "Company",
    description: "Company information",
  },
  title: {
    icon: Type,
    label: "Title",
    description: "Document title, reference, date",
  },
  text: {
    icon: Type,
    label: "Text",
    description: "Custom heading or text",
  },
  table: {
    icon: Table,
    label: "Table",
    description: "Data table with dynamic columns",
  },
  products: {
    icon: Package,
    label: "Products",
    description: "Product listing with totals",
  },
  logo: {
    icon: ImageIcon,
    label: "Logo",
    description: "Image or icon logo",
  },
  signature: {
    icon: Signature,
    label: "Signatures",
    description: "Signature blocks",
  },
  footer: {
    icon: Hash,
    label: "Footer",
    description: "Page numbers and info",
  },
  spacer: {
    icon: Square,
    label: "Spacer",
    description: "Vertical spacing",
  },
  line: {
    icon: Minus,
    label: "Line",
    description: "Horizontal divider",
  },
}

// =============================================================================
// FONTS
// =============================================================================

/** Available font families for reports */
export const FONT_FAMILIES = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Courier New",
]

/** Available font sizes for reports */
export const FONT_SIZES = [10, 11, 12, 14, 16, 18, 20]

// =============================================================================
// ICONS
// =============================================================================

/** All available Lucide icons for the icon picker */
export const LUCIDE_ICONS = [
  "Building2",
  "Briefcase",
  "Store",
  "Warehouse",
  "Package",
  "Box",
  "Packages",
  "FileText",
  "FileCheck",
  "Clipboard",
  "Scroll",
  "Document",
  "File",
  "Type",
  "Heading1",
  "Heading2",
  "Text",
  "AlignLeft",
  "AlignCenter",
  "AlignRight",
  "Table",
  "Table2",
  "Columns",
  "Rows",
  "Grid3x3",
  "LayoutGrid",
  "Image",
  "ImageIcon",
  "Picture",
  "Sparkles",
  "Star",
  "Heart",
  "Diamond",
  "Check",
  "CircleCheck",
  "CheckCircle",
  "XCircle",
  "AlertCircle",
  "Info",
  "Settings",
  "Gear",
  "Sliders",
  "Tune",
  "Wrench",
  "Tool",
  "Database",
  "Server",
  "HardDrive",
  "Cloud",
  "Download",
  "Upload",
  "Search",
  "Filter",
  "SortAsc",
  "SortDesc",
  "ArrowUpDown",
  "Calendar",
  "Clock",
  "Timer",
  "Alarm",
  "Hourglass",
  "User",
  "Users",
  "UserCircle",
  "UserCheck",
  "Users2",
  "Mail",
  "Phone",
  "Message",
  "Send",
  "AtSign",
  "MapPin",
  "Map",
  "Navigation",
  "Compass",
  "Globe",
  "Truck",
  "Car",
  "Van",
  "Bike",
  "Plane",
  "Ship",
  "BarChart",
  "LineChart",
  "PieChart",
  "TrendingUp",
  "TrendingDown",
  "Calculator",
  "DollarSign",
  "Euro",
  "PoundSterling",
  "Coins",
  "Link2",
  "Link",
  "Unlink",
  "ExternalLink",
  "Copy",
  "Layers",
  "Stack",
  "Folder",
  "FolderOpen",
  "Archive",
  "Tag",
  "Label",
  "Badge",
  "Sticker",
  "Bookmark",
  "Shield",
  "Lock",
  "Unlock",
  "Key",
  "Fingerprint",
  "Eye",
  "EyeOff",
  "View",
  "Scan",
]

// =============================================================================
// TABLE THEMES
// =============================================================================

/** Available visual themes for table sections */
export const TABLE_THEMES = [
  { id: "simple", name: "Simple", description: "Clean minimal borders" },
  { id: "striped", name: "Striped", description: "Alternating row colors" },
  { id: "boxed", name: "Boxed", description: "Borders on all cells" },
  { id: "modern", name: "Modern", description: "Bold header with accent" },
  { id: "compact", name: "Compact", description: "Dense rows for more data" },
]
