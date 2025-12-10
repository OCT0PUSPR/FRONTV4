# Admin Page Editor - Figma-like Improvements

## Summary

The **attributes** and **batch** pages are now fully set up with CASL permissions. All sections/fields have their IDs in the `page_sections` table, and the admin page editor has been enhanced to work like Figma with visual section selection.

## Database Status

### ✅ Sections Already in Database

All sections for **attributes** and **batch** pages are already in the `page_sections` table via `addToPageSections.sql`:

**Attributes Page Sections:**
- `attributes-header`, `attributes-header-title`, `attributes-header-description`, `attributes-header-add-button`
- `attributes-stats-section`, `attributes-stat-total`, `attributes-stat-display-types`, `attributes-stat-total-values`, `attributes-stat-visible-filters`
- `attributes-search-section`, `attributes-search-input`
- `attributes-grid-section`, `attributes-grid-item`
- `attributes-empty-state`
- `attributes-modal`, `attributes-modal-header`, `attributes-modal-title`, `attributes-modal-close-button`
- `attributes-modal-form`, `attributes-modal-name-field`, `attributes-modal-filter-visibility-field`
- `attributes-modal-display-type-field`, `attributes-modal-variant-creation-field`
- `attributes-modal-values-section`, `attributes-modal-add-value-button`, `attributes-modal-values-table`
- `attributes-modal-footer`, `attributes-modal-cancel-button`, `attributes-modal-save-button`

**Batch Page Sections:**
- `batch-header`, `batch-header-title`, `batch-header-description`, `batch-header-new-button`
- `batch-stats-section`, `batch-stat-total`, `batch-stat-draft`, `batch-stat-in-progress`, `batch-stat-completed`
- `batch-filters-section`, `batch-search-input`, `batch-status-filter`, `batch-dock-filter`, `batch-responsible-filter`
- `batch-grid-section`, `batch-card-item`
- `batch-empty-state`
- `batch-modal`, `batch-modal-header`, `batch-modal-title`, `batch-modal-close-button`
- `batch-modal-content`, `batch-modal-status-badge`, `batch-modal-edit-button`
- `batch-modal-info-section`, `batch-modal-transfers-table`

### ✅ Permissions Ready

The `addToSectionPermissions.sql` file contains all permission INSERT statements for these sections. You can run it to set default permissions.

## Admin Page Editor Improvements

### 🎨 Figma-like Visual Editor

The admin page editor now works like Figma:

1. **Visual Section Detection**
   - All sections are automatically detected via `data-section-id` attributes
   - Sections are highlighted with borders when you hover over them
   - Selected sections have a persistent solid border

2. **Hover Effects**
   - **Dashed blue border** (`2px dashed #5268ED`) when hovering over a section
   - **Tooltip** at the bottom showing section name and type
   - **Cursor changes** to pointer to indicate clickability

3. **Selection**
   - **Click any section** to select it (no dropdown needed)
   - **Selected section** has a **solid blue border** (`2px solid #5268ED`) with a subtle shadow
   - **Selected indicator** badge appears in the bottom-right showing which section you're editing
   - **Auto-scroll** to selected section when sidebar opens

4. **Control Panel Sidebar**
   - Opens on the right side when a section is selected
   - Contains all style and permission controls
   - Smooth animation when opening/closing
   - Closes and removes selection border when you click the X button

5. **Canvas Background**
   - **Checkerboard pattern** (like Figma) to clearly show the page boundaries
   - Dark theme for better contrast
   - Page content is centered with a white background

6. **Visual Feedback**
   - **Hover tooltip**: Shows section name and type at the bottom center
   - **Selected indicator**: Shows "Editing: [Section Name]" in bottom-right
   - **Section count**: Displayed in the top toolbar
   - **Selected badge**: Shows in toolbar when a section is selected

### How It Works

1. **Click "Edit Fields"** on any page in the admin panel
2. **Hover over sections** - you'll see dashed blue borders
3. **Click a section** - it gets a solid border and the sidebar opens
4. **Edit styles/permissions** in the sidebar
5. **Save** to apply changes
6. **Close sidebar** to deselect and continue editing other sections

### Technical Implementation

- Uses `data-section-id` attributes on all `CaslStyledSection` components
- Event listeners attached to detect clicks and hovers
- `MutationObserver` watches for dynamically rendered content
- Persistent borders applied via `useEffect` when section is selected
- Smooth scrolling to selected section
- Clean border removal when sidebar closes

## Next Steps

1. **Run the SQL files** (if not already done):
   ```bash
   mysql -u username -p database_name < addToPageSections.sql
   mysql -u username -p database_name < addToSectionPermissions.sql
   ```

2. **Update role values** in `addToSectionPermissions.sql` to match your actual `res_users.role` values

3. **Test the editor**:
   - Go to `/admin`
   - Click "Edit Fields" on attributes or batch page
   - Hover over sections to see borders
   - Click sections to select and edit

4. **Apply to other pages** (categories, dashboard, etc.) when ready

## Notes

- All sections already have IDs in the database - no additional SQL needed
- The editor automatically detects all sections with `data-section-id` attributes
- Sections are loaded from the database when the editor opens
- Permissions are checked in real-time via CASL
- Styles are applied immediately when saved

