# Workflow Builder V2

A modern, feature-rich workflow builder component built with React Flow and TypeScript.

## Features

- **Drag & Drop Interface**: Intuitive drag-and-drop functionality to add nodes to the canvas
- **Multiple Node Types**: Support for various node types including:
  - Trigger nodes (starting points)
  - Action nodes (perform operations)
  - Conditional nodes (branching logic)
  - Decision nodes (multiple branch decisions)
  - Delay nodes (time-based delays)
  - Notification nodes (send notifications)
- **Properties Panel**: Edit node properties in real-time
- **Visual Customization**: Beautiful, modern UI with gradients and smooth transitions
- **Keyboard Shortcuts**: 
  - Delete/Backspace: Delete selected elements
  - Ctrl/Cmd + D: Duplicate selected nodes
  - Ctrl/Cmd + Z: Undo
  - Ctrl/Cmd + Shift + Z: Redo
- **Save/Load**: Export and import workflows as JSON
- **Zoom Controls**: Zoom in/out and fit view to canvas
- **MiniMap**: Navigate large workflows easily

## Usage

The workflow builder is available at the `/workflow-v2` route.

### Components Structure

```
workflowV2/
├── nodes/              # Node components
│   ├── WorkflowNode.tsx
│   ├── DecisionNode.tsx
│   └── *.css
├── Palette/            # Left sidebar with draggable nodes
│   ├── Palette.tsx
│   └── Palette.css
├── PropertiesBar/      # Right sidebar for editing
│   ├── PropertiesBar.tsx
│   └── PropertiesBar.css
├── AppBar/             # Top toolbar with controls
│   ├── AppBar.tsx
│   └── AppBar.css
└── edges/              # Custom edge components
    ├── LabelEdge.tsx
    └── LabelEdge.css
```

### State Management

The workflow state is managed using Zustand in `stores/workflowStoreV2.ts`:

```typescript
import { useWorkflowStore } from '@/stores/workflowStoreV2';

// Access state and actions
const { nodes, edges, addNode, updateNodeData } = useWorkflowStore();
```

### Node Data Structure

Each node follows this structure:

```typescript
{
  id: string,
  type: 'node' | 'decision-node',
  position: { x: number, y: number },
  data: {
    type: string,           // Node type (trigger, action, etc.)
    icon: string,           // Lucide icon name
    templateType?: string,  // Optional template type
    properties: {
      label: string,
      description: string,
      status: 'active' | 'draft' | 'disabled' | 'archived',
      // Additional type-specific properties...
    }
  }
}
```

## Customization

### Adding New Node Types

1. Add the node definition to `data/workflow/nodes-data.ts`:

```typescript
export const myCustomNode: PaletteItem = {
  type: 'custom',
  icon: 'Star',  // Lucide icon name
  label: 'Custom Node',
  description: 'My custom node',
  defaultPropertiesData: {
    label: 'Custom',
    description: 'Custom node',
    // Add custom properties...
  },
  schema: {
    properties: {
      ...sharedProperties,
      // Define your schema...
    },
  },
};
```

2. Add it to the `paletteData` array
3. Optionally create a custom node component if needed

### Styling

All component styles use standard CSS files. Key style files:
- `workflowV2.css` - Main container and React Flow overrides
- `WorkflowNode.css` - Standard node styling
- `DecisionNode.css` - Decision node styling
- `Palette.css` - Left sidebar styling
- `PropertiesBar.css` - Right sidebar styling
- `AppBar.css` - Top toolbar styling

## Icons

The workflow builder uses Lucide React icons. All icon names should match the Lucide icon set:
https://lucide.dev/icons/

## Dependencies

- `@xyflow/react` - React Flow library for the workflow canvas
- `zustand` - State management (bundled with @xyflow/react)
- `lucide-react` - Icon library

## API

### Store Actions

- `addNode(type, position)` - Add a new node
- `updateNodeData(nodeId, data)` - Update node properties
- `deleteSelectedElements()` - Delete selected nodes/edges
- `duplicateSelectedNodes()` - Duplicate selected nodes
- `toggleSidebar()` - Toggle left sidebar
- `onConnect(connection)` - Handle edge connections

### App Bar Actions

- `onUndo()` - Undo last action
- `onRedo()` - Redo last undone action
- `onZoomIn()` - Zoom in
- `onZoomOut()` - Zoom out
- `onFitView()` - Fit view to canvas
- `onSave()` - Save workflow to localStorage
- `onExport()` - Export workflow as JSON
- `onImport()` - Import workflow from JSON file
- `onRun()` - Execute the workflow

## Future Enhancements

- Undo/Redo functionality with history stack
- Validation for node connections
- Auto-layout algorithms
- Real-time collaboration
- Workflow execution engine integration
- More node types (loops, parallel execution, etc.)
- Template library
- Search and filter nodes


