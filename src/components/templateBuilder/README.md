# XML Template Builder

A visual drag-and-drop template builder for creating custom warehouse document templates with XML-based storage and bilingual support (English/Arabic with RTL).

## Features

### Visual Template Builder
- **Three-panel Layout**: Components Palette (left), Canvas (center), Properties Panel (right)
- **Drag-and-Drop**: Drag components from the palette onto the canvas
- **Section-based**: Templates organized into Header, Body, and Footer sections
- **RTL Support**: Full support for Arabic right-to-left text direction
- **Live Preview**: Switch between English and Arabic preview modes
- **Zoom Controls**: Adjust canvas zoom level for detailed editing

### Component Types

#### Header Components
- **Logo**: Company logo from asset library
- **Title**: Bilingual title text
- **Document Number**: Dynamic document reference field
- **Date**: Dynamic date field with configurable format
- **Company Info**: Company details block
- **Recipient Info**: Customer/partner information block

#### Body Components
- **Text Block**: Rich text content with bilingual support
- **Field**: Dynamic data binding to document fields
- **Table**: Dynamic table with configurable columns
- **Image**: Static or dynamic images
- **Line**: Horizontal separator line
- **Spacer**: Adjustable vertical spacing
- **Barcode**: 1D barcode generation
- **QR Code**: 2D QR code generation
- **Page Break**: Force page break in PDF
- **Two Column**: Side-by-side layout
- **Info Box**: Styled information container
- **Signature Box**: Signature field with label

#### Footer Components
- **Page Number**: Dynamic page numbering
- **Generated Date**: Document generation timestamp
- **Static Text**: Fixed text content
- **Logo**: Secondary logo placement
- **Line**: Horizontal separator

### Document Types Supported
- Delivery Note
- Goods Receipt
- Internal Transfer
- Pick List
- Stock Summary
- Stock Card
- Physical Count Sheet
- Stock Adjustments
- Transfers List
- Scrap Document

### Asset Library
- **Logos**: Upload and manage company logos
- **Stamps**: Upload and manage approval/signature stamps
- Supports PNG, JPG, JPEG, SVG formats
- Maximum file size: 5MB

### Template Management
- Create, edit, duplicate, and delete templates
- Mark templates as favorites for quick access
- Recently used templates tracking
- Import/Export templates as XML files
- Template locking during editing (prevents conflicts)
- Autosave every 30 seconds

### Role-Based Access Control
- **Template Admin**: Full access to all templates and settings
- **Editor**: Can create and edit templates
- **User**: Can use templates to generate documents
- **Viewer**: Read-only access to templates

## File Structure

```
src/
  components/
    templateBuilder/
      TemplateBuilder.tsx     # Main builder component with three-panel layout
      ComponentPalette.tsx    # Left panel - draggable component list
      BuilderCanvas.tsx       # Center panel - visual canvas
      PropertiesPanel.tsx     # Right panel - component property editor
      README.md               # This documentation
  pages/
    ReportTemplatesPage.tsx   # Template listing page with Custom Templates section
    TemplateBuilderPage.tsx   # Full-page builder wrapper
  services/
    templateBuilder.service.ts  # API service for templates
  types/
    templateBuilder.types.ts    # TypeScript interfaces and constants
```

## Routes

- `/report-templates` - Template listing page
- `/template-builder/new` - Create new template
- `/template-builder/:templateId` - Edit existing template

## API Endpoints

### Templates
- `GET /api/reports/xml-templates` - List all templates
- `GET /api/reports/xml-templates/:id` - Get single template
- `POST /api/reports/xml-templates` - Create template
- `PUT /api/reports/xml-templates/:id` - Update template
- `DELETE /api/reports/xml-templates/:id` - Delete template
- `POST /api/reports/xml-templates/:id/duplicate` - Duplicate template
- `POST /api/reports/xml-templates/:id/favorite` - Toggle favorite
- `POST /api/reports/xml-templates/:id/lock` - Acquire edit lock
- `POST /api/reports/xml-templates/:id/unlock` - Release edit lock
- `POST /api/reports/xml-templates/:id/export` - Export as XML
- `POST /api/reports/xml-templates/import` - Import from XML

### Assets
- `GET /api/reports/assets/logos` - List logos
- `POST /api/reports/assets/logos` - Upload logo
- `GET /api/reports/assets/stamps` - List stamps
- `POST /api/reports/assets/stamps` - Upload stamp

### Blocks (Reusable Components)
- `GET /api/reports/blocks` - List blocks
- `POST /api/reports/blocks` - Create block
- `POST /api/reports/blocks/:id/share` - Share block
- `GET /api/reports/blocks/shared` - List shared blocks

### Roles
- `GET /api/reports/roles` - List roles
- `GET /api/reports/permissions/me` - Get current user permissions

## Database Tables

- `xml_templates` - Main template storage
- `xml_template_translations` - Bilingual content
- `template_logos` - Logo assets
- `template_stamps` - Stamp assets
- `template_blocks` - Reusable blocks
- `template_roles` - Role definitions
- `template_user_roles` - User-role assignments
- `template_role_access` - Template-role permissions
- `template_audit_log` - Change history
- `template_autosave` - Autosave data

## Usage

### Creating a New Template

1. Navigate to `/report-templates`
2. Click "Create Template" button
3. Select a document type
4. The builder opens with empty sections
5. Drag components from the palette to the canvas
6. Configure component properties in the right panel
7. Click "Save" to store the template

### Editing a Template

1. Navigate to `/report-templates`
2. Find your template in the Custom Templates section
3. Click on the template or select "Edit" from the menu
4. Make changes in the builder
5. Changes autosave every 30 seconds
6. Click "Save" for manual save

### Using Templates for Document Generation

Templates are integrated with the report generation system. When generating a document:

1. Select a custom template from the template selector
2. The system populates dynamic fields with document data
3. Generate PDF output with proper formatting and RTL support

## Keyboard Shortcuts

- `Ctrl/Cmd + S` - Save template
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Shift + Z` - Redo
- `Delete` - Remove selected component

## Styling

The builder uses the application's theme system with support for:
- Light and dark mode
- Custom color scheme via `useTheme()` hook
- Consistent spacing and typography

## Technical Notes

- Templates are stored as XML for portability and standardization
- The canvas uses a paper preview (A4 size by default)
- Component IDs are generated using timestamp + random string
- Edit locks expire after 30 minutes of inactivity
- Autosave stores to a separate table, not the main template
