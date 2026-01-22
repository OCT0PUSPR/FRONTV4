# Warehouse Navigator - 3D Interactive Visualization

## Overview

The Warehouse Navigator is a 3D interactive visualization feature that allows users to navigate, search, and inspect warehouse storage locations through an immersive spatial interface. Built with React Three Fiber for declarative 3D rendering.

**Route:** `/warehouse-navigator`
**Access:** Protected route requiring authentication

## Features

### 3D Visualization
- Interactive 3D warehouse view with zoom, pan, and rotate controls
- Visual distinction between empty (wireframe) and occupied (solid) bins
- Selection highlighting with pulse animation
- Smooth camera animations when navigating to locations

### Sidebar Navigation
- Hierarchical location tree with expand/collapse
- Warehouse selector dropdown
- Real-time search filtering
- Level visibility toggles (AA-AG)
- Resizable sidebar (240px - 480px)

### Real-time Updates
- WebSocket connection for live stock updates
- Automatic reconnection with exponential backoff
- Toast notifications when stock changes
- Connection status indicator

### Minimap
- 2D overhead view of warehouse layout
- Click to navigate camera position
- Current position indicator

### Internationalization
- Full English and Arabic support
- RTL layout support for Arabic

## Architecture

### Directory Structure

```
src/pages/WarehouseNavigator/
├── index.tsx                    # Main page component
├── WarehouseNavigator.css       # CSS animations and styles
├── README.md                    # This documentation
├── types/
│   └── index.ts                 # TypeScript interfaces
├── utils/
│   ├── colorTheme.ts           # Color constants for light/dark mode
│   ├── positionCalculator.ts   # 3D position calculation from location codes
│   └── hierarchyBuilder.ts     # Build tree from flat Odoo locations
├── hooks/
│   ├── useWarehouseData.ts     # Data fetching from backend API
│   ├── useWebSocket.ts         # Real-time stock updates
│   ├── useCameraAnimation.ts   # Smooth camera transitions
│   ├── useResizable.ts         # Sidebar resize handling
│   └── useLocationParser.ts    # Parse location codes
└── components/
    ├── Scene.tsx               # React Three Fiber Canvas wrapper
    ├── Warehouse.tsx           # Main 3D warehouse group
    ├── RackRow.tsx             # Row of racks
    ├── Rack.tsx                # Single rack with levels
    ├── Bin.tsx                 # Individual storage bin mesh
    ├── Floor.tsx               # Warehouse floor with grid
    ├── CameraController.tsx    # Orbit controls + camera animations
    ├── Sidebar.tsx             # Left sidebar panel
    ├── LocationTree.tsx        # Hierarchical tree component
    ├── SearchInput.tsx         # Search with filtering
    ├── LevelToggles.tsx        # Level visibility checkboxes
    ├── Minimap.tsx             # 2D overhead map
    ├── Toolbar.tsx             # Top toolbar (back, home, help, fullscreen)
    ├── Breadcrumbs.tsx         # Navigation breadcrumbs
    ├── BinModal.tsx            # Stock detail modal
    ├── EmptyState.tsx          # No locations illustration
    ├── ConnectionStatus.tsx    # WebSocket status indicator
    └── HelpTour.tsx            # Onboarding tooltips
```

## Data Model

### Location Code Pattern

Example: `AR14AF01`
- `AR` - Row identifier (two letters)
- `14` - Bay position (01-20)
- `AF` - Level (AA-AG = 7 levels)
- `01` - Side (01=left, 02=right)

### Physical Layout

| Dimension | Value |
|-----------|-------|
| Rows | 8 total (4 back-to-back pairs) |
| Bays per row | 20 |
| Levels per rack | 7 (AA-AG) |
| Bins per level | 2 (left/right) |
| Total bins | ~2,240 |

### Back-to-Back Row Pairing

Consecutive alphabetical rows (AG+AH, AI+AJ) are positioned back-to-back with only a small gap between them. Non-consecutive pairs have walkway aisles.

## API Integration

### Backend Endpoints Used

```
POST /api/warehouses       - Get warehouse list
POST /api/locations        - Get locations for warehouse
POST /api/quants          - Get stock (quants) for location
```

### WebSocket Events

```javascript
// Server -> Client
'stock-update' - Stock quantity changed in a location
'new-notification' - General notification (may contain stock updates)

// Client -> Server
'join-warehouse-room' - Subscribe to warehouse updates
'join-user-room' - Subscribe to user notifications
```

## Usage

### Camera Controls

| Action | Mouse | Touch |
|--------|-------|-------|
| Rotate | Left drag | One finger drag |
| Pan | Right drag / Shift+Left | Two finger drag |
| Zoom | Scroll wheel | Pinch |

### Navigation

1. **Sidebar Tree:** Click to select location, double-click to open bin detail modal
2. **3D View:** Click on bins to select them
3. **Breadcrumbs:** Click to navigate to parent levels
4. **Minimap:** Click to move camera to that position
5. **Back Button:** Return to previous selection
6. **Home Button:** Return to full warehouse overview

### Search & Filter

- Type in search box to filter locations in both tree and 3D view
- Use level toggles (AA-AG) to show/hide specific shelf heights
- Matching locations remain visible, non-matching are hidden

## Color Theme

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | #f5f5f0 | #1a1a18 |
| Floor | #D4C4A8 | #3D3830 |
| Rack Structure | #9A9590 | #6A6560 |
| Empty Bins | #B0A899 (wireframe) | #807868 (wireframe) |
| Occupied Bins | #E07020 (solid) | #E07020 (solid) |
| Selection | #FF8C00 (glow) | #FF8C00 (glow) |

## Performance

### Optimizations Applied

- React Three Fiber for efficient React-based 3D rendering
- Lazy stock data loading (fetch only when bin is selected)
- Suspense boundaries for code splitting
- Instanced rendering capability for large bin counts
- Frustum culling (automatic via Three.js)
- 60 FPS target on modern devices

### Loading Sequence

1. Show loading spinner in sidebar
2. Fetch warehouse list
3. Auto-select first warehouse
4. Fetch locations for selected warehouse
5. Build 3D geometry from location hierarchy
6. Fetch stock summary to mark occupied bins
7. Establish WebSocket connection
8. Ready for interaction

## Error Handling

| Error | Handling |
|-------|----------|
| API fetch failure | Toast error notification |
| WebSocket disconnect | Status indicator changes, auto-reconnect |
| WebGL not supported | Error fallback component with message |
| No locations configured | Empty state with link to settings |

## Accessibility

- Keyboard navigation in sidebar tree (Tab, Enter, Space)
- ARIA attributes on tree items
- Focus indicators on interactive elements
- Status announcements for connection changes
- Reduced motion support (animations disabled when preferred)
- High contrast mode support

## Dependencies

The feature uses these key packages (already installed):

```json
{
  "@react-three/fiber": "^8.x",
  "@react-three/drei": "^9.x",
  "three": "^0.160.x",
  "socket.io-client": "^4.x"
}
```

## Translation Keys

All UI text is internationalized under the `warehouse_navigator` namespace. See:
- `src/locales/en/translation.json`
- `src/locales/ar/translation.json`

## Future Considerations

These features are out of scope for initial implementation:
- Heat map visualization
- Historical stock animations
- Multi-warehouse simultaneous view
- VR/AR support
- Export to image/PDF
- Product search across bins
- Route planning for picking
