# Warehouse 3D Navigator - Technical Specification

## Overview

A 3D interactive visualization of warehouse storage locations, enabling users to navigate, search, and inspect bin contents through an immersive spatial interface. Built with React Three Fiber for declarative 3D rendering within the React ecosystem.

---

## Route & Page Structure

- **Route:** `/warehouse/navigator`
- **Type:** Standalone full-page view
- **Access:** Protected route requiring authentication

---

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| 3D Engine | React Three Fiber | Declarative Three.js for React, hooks-based, excellent DX |
| State Management | React Context + useState | Matches existing app patterns |
| Real-time | WebSocket | Live stock updates with auto-reconnect |
| Styling | CSS + inline styles | Matches app conventions |
| i18n | react-i18next | English + Arabic support |

---

## Data Architecture

### Location Hierarchy (from Odoo stock.location)

```
WH (Warehouse) - ignored in display
└── Stock - ignored in display
    └── [Row] (e.g., AG, AH, AR)
        └── [Bay] (e.g., 01-20)
            └── [Level] (e.g., AA-AG)
                └── [Side] (01=left, 02=right)
```

### Location Code Pattern

Example: `AR14AF01`
- `AR` - Aisle/Row identifier (two letters)
- `14` - Bay position (01-20, left to right)
- `AF` - Level (AA, AB, AC, AD, AE, AF, AG = 7 levels)
- `01` - Side (01=left, 02=right within same bay)

### Physical Layout

| Dimension | Value |
|-----------|-------|
| Rows | 8 total (4 back-to-back pairs) |
| Bays per row | 20 |
| Levels per rack | 7 (AA-AG) |
| Bins per level | 2 (left/right) |
| **Total bins** | ~2,240 |

### Back-to-Back Row Pairing

- Consecutive alphabetical rows are back-to-back (AG+AH, AI+AJ, etc.)
- Back-to-back pairs have NO aisle between them
- Non-consecutive pairs have walkway aisles between them

---

## Data Fetching Strategy

### Initial Load
1. **Locations first:** Fetch all stock.location records for selected warehouse
2. **Stock lazy:** Fetch stock.quant data on-demand per location when selected/clicked

### API Endpoints

```javascript
// Get warehouse list
GET /smart-fields/data/stock.warehouse

// Get locations for warehouse
POST /smart-fields/data/stock.location/execute
{
  method: 'search_read',
  args: [[['warehouse_id', '=', warehouseId]]],
  kwargs: { fields: ['id', 'name', 'complete_name', 'parent_id', 'child_ids', 'usage'] }
}

// Get stock for location (lazy)
POST /smart-fields/data/stock.quant/execute
{
  method: 'search_read',
  args: [[['location_id', '=', locationId]]],
  kwargs: { fields: ['product_id', 'quantity', 'lot_id', 'product_uom_id'] }
}
```

---

## 3D Scene Specification

### Visual Style: Clean Minimalist + Warm Industrial

| Element | Color | Notes |
|---------|-------|-------|
| Floor | Beige/Tan (#D4C4A8) | Rectangular, extends beyond racks |
| Walls | Light warm gray (#E8E4DE) | Surrounding boundary |
| Racks (structure) | Warm gray (#9A9590) | Metal rack frames |
| Bins (empty) | Wireframe outline (#B0A899) | Hollow appearance |
| Bins (occupied) | Solid orange (#E07020) | Single color for all occupied |
| Aisles | Marked paths (#C9BFA8) | Visible walkway markings |
| Selection highlight | Bright orange (#FF8C00) | Glow effect on selected |

### Geometry Layout

```
┌─────────────────────────────────────────────────────────────┐
│                         WAREHOUSE                            │
│  ┌─────┐ ┌─────┐   ┌─────┐ ┌─────┐   ┌─────┐ ┌─────┐       │
│  │ AG  │ │ AH  │   │ AI  │ │ AJ  │   │ AK  │ │ AL  │  ...  │
│  │     │ │     │   │     │ │     │   │     │ │     │       │
│  │ === │ │ === │   │ === │ │ === │   │ === │ │ === │       │
│  │ === │ │ === │   │ === │ │ === │   │ === │ │ === │       │
│  │ === │ │ === │   │ === │ │ === │   │ === │ │ === │       │
│  └──┬──┘ └──┬──┘   └──┬──┘ └──┬──┘   └──┬──┘ └──┬──┘       │
│     └──┬──┘           └──┬──┘           └──┬──┘             │
│    small gap         AISLE            AISLE                 │
│   (back-to-back)    (walkway)        (walkway)              │
└─────────────────────────────────────────────────────────────┘
```

### Rack Structure (Side View)

```
Level AG  ┌─────────────────┐
Level AF  ├─────────────────┤
Level AE  ├─────────────────┤
Level AD  ├─────────────────┤
Level AC  ├─────────────────┤
Level AB  ├─────────────────┤
Level AA  ├─────────────────┤
          └─────────────────┘
          │  01  │  02  │
          (left)  (right)
```

### Position Algorithm

```typescript
interface LocationPosition {
  row: string;      // AG, AH, etc.
  bay: number;      // 1-20
  level: string;    // AA-AG
  side: number;     // 1 or 2
}

function calculatePosition(loc: LocationPosition): Vector3 {
  const ROW_SPACING = 3.0;        // Space between non-back-to-back rows
  const BACK_TO_BACK_GAP = 0.3;   // Small gap between back-to-back pairs
  const BAY_WIDTH = 1.2;
  const LEVEL_HEIGHT = 0.8;
  const BIN_WIDTH = 0.5;

  // Calculate row index and pair grouping
  const rowIndex = getRowIndex(loc.row);  // AG=0, AH=1, AI=2, etc.
  const pairIndex = Math.floor(rowIndex / 2);
  const isSecondInPair = rowIndex % 2 === 1;

  const x = (loc.bay - 1) * BAY_WIDTH + (loc.side - 1) * BIN_WIDTH;
  const y = getLevelIndex(loc.level) * LEVEL_HEIGHT;
  const z = pairIndex * (ROW_SPACING + BACK_TO_BACK_GAP * 2) +
            (isSecondInPair ? BACK_TO_BACK_GAP : 0);

  return new Vector3(x, y, z);
}
```

---

## Performance Optimization

### Target: 60 FPS on Modern Devices

| Technique | Implementation |
|-----------|----------------|
| Instanced Meshes | Use InstancedMesh for bins (~2000 instances) |
| LOD (Level of Detail) | Simplified geometry when zoomed out |
| Frustum Culling | Three.js automatic + manual for groups |
| Skeleton Loading | Show placeholder geometry while data loads |
| Lazy Stock Data | Only fetch stock.quant when bin selected |

### Loading Sequence

1. Show loading skeleton (gray placeholder racks)
2. Fetch location hierarchy
3. Build 3D geometry from hierarchy
4. Replace skeleton with actual geometry
5. Establish WebSocket connection
6. Mark as ready

---

## Camera System

### Controls: Orbit Only

| Action | Mouse | Touch |
|--------|-------|-------|
| Rotate | Left drag | One finger drag |
| Pan | Right drag / Shift+Left | Two finger drag |
| Zoom | Scroll wheel | Pinch |

### Camera Animations

```typescript
interface CameraTarget {
  position: Vector3;
  lookAt: Vector3;
  duration: number;  // ms
}

// Fly to location with easing
function flyToLocation(target: CameraTarget): void {
  // Use GSAP or @react-spring/three for smooth animation
  // Duration: 800ms for nearby, 1200ms for distant
  // Easing: easeInOutCubic
}
```

### Selection Behavior: Isolate

When a location (row/rack/bin) is selected:
1. Animate camera to face the selection
2. Fade out / hide all non-selected locations
3. Show only the selected location and its children
4. Update breadcrumbs and sidebar selection

---

## UI Components

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│ [Back] [Breadcrumbs: Warehouse > Row AG > Rack 14]    [?] [⛶] │
├──────────────┬─────────────────────────────────────────────────┤
│   SIDEBAR    │                                                 │
│              │                                                 │
│ [Warehouse▼] │              3D CANVAS                          │
│              │                                                 │
│ [🔍 Search]  │                                                 │
│              │                                                 │
│ ☐ Level AA   │                                                 │
│ ☐ Level AB   │                                    ┌──────────┐ │
│ ☐ Level AC   │                                    │ MINIMAP  │ │
│ ☐ Level AD   │                                    │    ◉     │ │
│ ☐ Level AE   │                                    └──────────┘ │
│ ☐ Level AF   │                                                 │
│ ☐ Level AG   │                                                 │
│              │                                                 │
│ ▶ Row AG     │                                                 │
│   ▶ Rack 01  │                                                 │
│     Level AA │                                                 │
│       Bin 01 │                                                 │
│       Bin 02 │                                                 │
│     ...      │                                                 │
│   ▶ Rack 02  │                                                 │
│   ...        │                                                 │
│ ▶ Row AH     │                                                 │
│ ...          │                                                 │
│              │                                                 │
├──────────────┴─────────────────────────────────────────────────┤
│ [WebSocket: Connected ●]              [Stock updates: Live]    │
└────────────────────────────────────────────────────────────────┘
```

### 1. Sidebar (Resizable)

**Features:**
- Drag edge to resize width (min: 240px, max: 480px)
- Warehouse dropdown selector at top
- Search input with location filtering
- Level visibility toggles (checkboxes for AA-AG)
- Hierarchical tree (collapsed by default)
- Full mini-summary per node: name + item count + total qty

**Tree Node Format:**
```
▶ Row AG                    [24 items | 156 qty]
  ▶ Rack 01                 [8 items | 42 qty]
    ▶ Level AA              [2 items | 12 qty]
      ○ Bin 01              [1 item | 8 qty]
      ● Bin 02 (occupied)   [1 item | 4 qty]
```

**Search Behavior:**
- Filter as you type
- Hide non-matching locations in BOTH tree AND 3D view
- Clear search to restore all locations

### 2. Toolbar

| Button | Icon | Action |
|--------|------|--------|
| Back | ← | Navigate up one level |
| Home | 🏠 | Return to full warehouse overview |
| Help | ? | Open tooltip tour |
| Fullscreen | ⛶ | Toggle fullscreen mode |

### 3. Breadcrumbs

```
Warehouse > Row AG > Rack 14 > Level AF > Bin 01
   ↑          ↑         ↑          ↑         ↑
 (click to zoom out to that level)
```

### 4. Minimap

- Position: Bottom-right corner of canvas
- Size: 160x120px
- Features:
  - 2D overhead view of warehouse
  - Camera position indicator (dot/cone)
  - Current selection highlighted
  - **Click to navigate** camera to that position

### 5. Bin Detail Modal

**Trigger:** Click on bin in 3D or double-click in sidebar

**Content:**
```
┌─────────────────────────────────────────┐
│ Bin: AR14AF01                      [X]  │
│ Location: Row AR > Rack 14 > Level AF   │
├─────────────────────────────────────────┤
│ STOCK                                    │
│                                          │
│ [img] Product ABC-123          Qty: 24  │
│       Lot: LOT-2024-001        Units    │
│                                          │
│ [img] Product XYZ-789          Qty: 12  │
│       Lot: LOT-2024-045        Units    │
│                                          │
│ [img] Product DEF-456          Qty: 8   │
│       (No lot)                 Boxes    │
│                                          │
│                     Total: 3 products   │
└─────────────────────────────────────────┘
```

**Fields displayed:**
- Product name (with 40x40 thumbnail)
- Quantity on hand
- Lot/Serial number (if tracked)
- Unit of measure

**Modal behavior:**
- Click backdrop to close
- Press Escape to close
- No actions (view-only)

---

## Real-time Updates (WebSocket)

### Connection

```typescript
// WebSocket endpoint
const WS_URL = `${API_CONFIG.WS_BASE_URL}/warehouse/stock-updates`;

// Connection with auto-reconnect
interface WSConfig {
  reconnectAttempts: number;      // Infinite
  reconnectInterval: number;       // Start 1000ms, exponential backoff
  maxReconnectInterval: number;    // Cap at 30000ms
}
```

### Message Format

```typescript
interface StockUpdateMessage {
  type: 'stock_update';
  location_id: number;
  warehouse_id: number;
  changes: {
    product_id: number;
    product_name: string;
    old_qty: number;
    new_qty: number;
    lot_id?: number;
  }[];
  timestamp: string;
}
```

### Update Handling

1. **If location is visible:**
   - Pulse animation on affected bin (0.5s orange glow)
   - Show mini toast notification: "Stock updated in AR14AF01"
   - Update sidebar counts

2. **If location is hidden (filtered/different warehouse):**
   - Ignore update (don't queue or notify)

### Connection Status UI

```
[●] Connected          - Green dot
[○] Reconnecting...    - Yellow dot, animated
[●] Disconnected       - Red dot
```

---

## State Management

### Global State

```typescript
interface WarehouseNavigatorState {
  // Data
  warehouses: Warehouse[];
  selectedWarehouseId: number | null;
  locations: LocationNode[];
  stockCache: Map<number, StockQuant[]>;

  // UI State
  selectedLocationId: number | null;
  expandedTreeNodes: Set<number>;
  searchQuery: string;
  visibleLevels: Set<string>;  // AA, AB, etc.
  sidebarWidth: number;

  // Camera
  cameraPosition: Vector3;
  cameraTarget: Vector3;
  isAnimating: boolean;

  // Connection
  wsStatus: 'connected' | 'reconnecting' | 'disconnected';

  // Modal
  binModalOpen: boolean;
  binModalLocationId: number | null;
}
```

### No Persistence

- State resets on page load
- No localStorage or server-side preference storage

---

## Internationalization (i18n)

### Supported Languages

| Language | Code | Direction |
|----------|------|-----------|
| English | en | LTR |
| Arabic | ar | RTL |

### RTL Handling

- **UI:** Sidebar flips to right side
- **3D Scene:** No change (stays same orientation)
- **Minimap:** Stays in bottom-right

### Translation Keys

```json
{
  "warehouse_navigator": {
    "title": "Warehouse Navigator",
    "search_placeholder": "Search locations...",
    "no_results": "No locations found",
    "loading": "Loading warehouse...",
    "empty_warehouse": "No locations configured",
    "empty_warehouse_desc": "Configure locations in Odoo to visualize your warehouse",
    "select_warehouse": "Select Warehouse",
    "level_filter": "Level Filter",
    "items": "items",
    "total_qty": "total qty",
    "stock_updated": "Stock updated in {{location}}",
    "connection_lost": "Connection lost. Reconnecting...",
    "connected": "Connected",
    "bin_details": "Bin Details",
    "no_stock": "No stock in this location",
    "product": "Product",
    "quantity": "Quantity",
    "lot": "Lot/Serial",
    "uom": "Unit",
    "controls_help": "Controls",
    "rotate": "Rotate",
    "pan": "Pan",
    "zoom": "Zoom",
    "click_to_select": "Click to select",
    "fullscreen": "Fullscreen",
    "exit_fullscreen": "Exit Fullscreen"
  }
}
```

---

## Empty State

When warehouse has no configured locations:

```
┌─────────────────────────────────────────┐
│                                         │
│         [Warehouse Illustration]        │
│                                         │
│    No locations configured              │
│                                         │
│    Configure storage locations in       │
│    Odoo to visualize your warehouse.    │
│                                         │
│    [Go to Inventory Settings]           │
│                                         │
└─────────────────────────────────────────┘
```

---

## Error Handling

| Error | Handling |
|-------|----------|
| API fetch failure | Toast error, retry button |
| WebSocket disconnect | Status indicator, auto-reconnect |
| Invalid location code | Toast error listing unparseable locations |
| WebGL not supported | Fallback message with browser requirements |
| Warehouse not found | Redirect to warehouse selection |

---

## Accessibility

### Keyboard

| Key | Action |
|-----|--------|
| Escape | Close modal / Return to overview |
| Tab | Navigate sidebar tree |
| Enter | Select focused tree item |
| Space | Toggle tree node expand/collapse |

### Screen Readers

- Sidebar tree has proper ARIA attributes
- Modal has focus trap and aria-modal
- Status announcements for stock updates

### Visual

- Sufficient color contrast (WCAG AA)
- Focus indicators on interactive elements
- No reliance on color alone (wireframe vs solid for empty/occupied)

---

## Help / Onboarding

### Tooltip Tour (on Help button click)

**Step 1:** "Use your mouse to rotate, pan, and zoom the 3D view"
**Step 2:** "Click on any location in the sidebar or 3D view to navigate to it"
**Step 3:** "Use the search box to find specific locations"
**Step 4:** "Toggle level visibility to focus on specific shelf heights"
**Step 5:** "Click the minimap to quickly navigate the warehouse"

Tour shows tooltips pointing to each UI element sequentially.

---

## File Structure

```
src/
├── pages/
│   └── WarehouseNavigator/
│       ├── index.tsx                 # Main page component
│       ├── WarehouseNavigator.css    # Styles
│       ├── components/
│       │   ├── Scene.tsx             # R3F Canvas wrapper
│       │   ├── Warehouse.tsx         # Main 3D warehouse group
│       │   ├── RackRow.tsx           # Row of racks
│       │   ├── Rack.tsx              # Single rack with levels
│       │   ├── Bin.tsx               # Individual bin mesh
│       │   ├── Floor.tsx             # Warehouse floor + walls
│       │   ├── Aisle.tsx             # Aisle markings
│       │   ├── CameraController.tsx  # Orbit controls + animations
│       │   ├── Sidebar.tsx           # Left sidebar panel
│       │   ├── LocationTree.tsx      # Hierarchical tree
│       │   ├── SearchInput.tsx       # Search with filtering
│       │   ├── LevelToggles.tsx      # Level visibility checkboxes
│       │   ├── Minimap.tsx           # 2D overhead map
│       │   ├── Toolbar.tsx           # Top toolbar
│       │   ├── Breadcrumbs.tsx       # Navigation breadcrumbs
│       │   ├── BinModal.tsx          # Stock detail modal
│       │   ├── EmptyState.tsx        # No locations illustration
│       │   ├── ConnectionStatus.tsx  # WebSocket status
│       │   └── HelpTour.tsx          # Onboarding tooltips
│       ├── hooks/
│       │   ├── useWarehouseData.ts   # Data fetching
│       │   ├── useWebSocket.ts       # Real-time updates
│       │   ├── useLocationParser.ts  # Parse location codes
│       │   ├── useCameraAnimation.ts # Smooth camera moves
│       │   └── useResizable.ts       # Sidebar resize
│       ├── utils/
│       │   ├── positionCalculator.ts # 3D position from location
│       │   ├── hierarchyBuilder.ts   # Build tree from flat locations
│       │   └── colorTheme.ts         # Color constants
│       └── types/
│           └── index.ts              # TypeScript interfaces
└── locales/
    ├── en/
    │   └── warehouse-navigator.json
    └── ar/
        └── warehouse-navigator.json
```

---

## Dependencies to Add

```json
{
  "@react-three/fiber": "^8.x",
  "@react-three/drei": "^9.x",
  "three": "^0.160.x",
  "@react-spring/three": "^9.x"
}
```

---

## Testing Considerations

### Unit Tests
- Location code parser
- Position calculator
- Hierarchy builder
- Stock data transformations

### Integration Tests
- API data fetching
- WebSocket connection/reconnection
- Camera animations

### E2E Tests
- Full navigation flow
- Search and filter
- Modal open/close
- Warehouse switching

---

## Performance Benchmarks

| Metric | Target |
|--------|--------|
| Initial load | < 3 seconds |
| Frame rate | 60 FPS (modern devices) |
| Camera animation | 60 FPS during transitions |
| Search filter | < 100ms response |
| WebSocket latency | < 500ms update to visual |

---

## Future Considerations (Out of Scope)

- Heat map visualization
- Historical stock animations
- Multi-warehouse simultaneous view
- VR/AR support
- Export to image/PDF
- Product search (find which bin contains product X)
- Route planning for picking

---

## Odoo Data Models Reference

### Fetching Model Fields

Use the fields controller to discover available fields:

```javascript
// POST /api/fields/get-model-fields
{
  sessionId: "...",
  model: "stock.location"  // or "stock.quant", "stock.warehouse"
}

// Response includes all field names and metadata
```

### stock.location (Expected Fields)

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| name | char | Location name (e.g., "AG", "14", "AF", "01") |
| complete_name | char | Full path (e.g., "WH/Stock/AG/14/AF/01") |
| parent_id | many2one | Parent location reference |
| child_ids | one2many | Child locations |
| location_id | many2one | Parent (alias for parent_id) |
| usage | selection | Type: 'internal', 'view', 'supplier', 'customer', etc. |
| warehouse_id | many2one | Associated warehouse |
| barcode | char | Location barcode |
| posx | integer | X position (if using Odoo positioning) |
| posy | integer | Y position |
| posz | integer | Z position (level) |

### stock.quant (Expected Fields)

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| product_id | many2one | Product reference |
| location_id | many2one | Storage location |
| lot_id | many2one | Lot/Serial number (if tracked) |
| quantity | float | Quantity on hand |
| reserved_quantity | float | Reserved quantity |
| product_uom_id | many2one | Unit of measure |
| in_date | datetime | Date received |
| inventory_quantity | float | Counted quantity (for inventory) |

### stock.warehouse (Expected Fields)

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Primary key |
| name | char | Warehouse name |
| code | char | Short code |
| lot_stock_id | many2one | Main stock location |
| view_location_id | many2one | View location (parent) |
| company_id | many2one | Company |

### Querying Location Hierarchy

```javascript
// Get all internal locations for a warehouse
POST /smart-fields/data/stock.location/execute
{
  method: 'search_read',
  args: [[
    ['warehouse_id', '=', warehouseId],
    ['usage', '=', 'internal']
  ]],
  kwargs: {
    fields: ['id', 'name', 'complete_name', 'parent_id', 'child_ids'],
    order: 'complete_name'
  }
}
```

### Building Location Hierarchy

The `complete_name` field provides the full path which can be parsed:

```typescript
// "WH/Stock/AG/14/AF/01" → ["WH", "Stock", "AG", "14", "AF", "01"]
function parseLocationPath(completeName: string): string[] {
  return completeName.split('/');
}

// Determine location type from path depth (after WH/Stock)
function getLocationType(path: string[]): 'row' | 'bay' | 'level' | 'bin' {
  const depth = path.length - 2; // Remove WH and Stock
  switch (depth) {
    case 1: return 'row';    // AG
    case 2: return 'bay';    // AG/14
    case 3: return 'level';  // AG/14/AF
    case 4: return 'bin';    // AG/14/AF/01
    default: return 'bin';
  }
}
```

---

## Sign-off

This specification captures all requirements gathered through the interview process. Implementation should follow these guidelines while maintaining flexibility for technical discoveries during development.

**Document Version:** 1.0
**Date:** 2026-01-21
**Status:** Ready for Implementation
