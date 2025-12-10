-- =============================================
-- SQL Script to populate the 'page_sections' table
-- Sections for Attributes and Batch pages as listed in ADMIN_PAGE_EDITOR_IMPROVEMENTS.md
-- =============================================

-- ============================================
-- ATTRIBUTES PAGE SECTIONS
-- ============================================
INSERT INTO page_sections (section_id, page_id, section_type, section_name, parent_section_id, display_order, inherit_permissions, override_parent) VALUES
-- Header Section
('attributes-header', 'attributes', 'section', 'Page Header', NULL, 1, TRUE, FALSE),
('attributes-header-title', 'attributes', 'field', 'Page Title', 'attributes-header', 1, TRUE, FALSE),
('attributes-header-description', 'attributes', 'field', 'Page Description', 'attributes-header', 2, TRUE, FALSE),
('attributes-header-add-button', 'attributes', 'button', 'Add Attribute Button', 'attributes-header', 3, TRUE, FALSE),

-- Statistics Section
('attributes-stats-section', 'attributes', 'section', 'Statistics Cards', NULL, 2, TRUE, FALSE),
('attributes-stat-total', 'attributes', 'component', 'Total Attributes Card', 'attributes-stats-section', 1, TRUE, FALSE),
('attributes-stat-display-types', 'attributes', 'component', 'Display Types Card', 'attributes-stats-section', 2, TRUE, FALSE),
('attributes-stat-total-values', 'attributes', 'component', 'Total Values Card', 'attributes-stats-section', 3, TRUE, FALSE),
('attributes-stat-visible-filters', 'attributes', 'component', 'Visible Filters Card', 'attributes-stats-section', 4, TRUE, FALSE),

-- Search Section
('attributes-search-section', 'attributes', 'section', 'Search Bar', NULL, 3, TRUE, FALSE),
('attributes-search-input', 'attributes', 'field', 'Search Input', 'attributes-search-section', 1, TRUE, FALSE),

-- Grid Section
('attributes-grid-section', 'attributes', 'section', 'Attributes Grid', NULL, 4, TRUE, FALSE),
('attributes-grid-item', 'attributes', 'component', 'Attribute Card', 'attributes-grid-section', 1, TRUE, FALSE),

-- Empty State Section
('attributes-empty-state', 'attributes', 'section', 'Empty State', NULL, 5, TRUE, FALSE),

-- Modal Section
('attributes-modal', 'attributes', 'section', 'Attribute Modal', NULL, 6, TRUE, FALSE),
('attributes-modal-header', 'attributes', 'section', 'Modal Header', 'attributes-modal', 1, TRUE, FALSE),
('attributes-modal-title', 'attributes', 'field', 'Modal Title', 'attributes-modal-header', 1, TRUE, FALSE),
('attributes-modal-close-button', 'attributes', 'button', 'Close Button', 'attributes-modal-header', 2, TRUE, FALSE),

-- Modal Form Section
('attributes-modal-form', 'attributes', 'section', 'Modal Form', 'attributes-modal', 2, TRUE, FALSE),
('attributes-modal-name-field', 'attributes', 'field', 'Attribute Name Field', 'attributes-modal-form', 1, TRUE, FALSE),
('attributes-modal-filter-visibility-field', 'attributes', 'field', 'Filter Visibility Field', 'attributes-modal-form', 2, TRUE, FALSE),
('attributes-modal-display-type-field', 'attributes', 'field', 'Display Type Field', 'attributes-modal-form', 3, TRUE, FALSE),
('attributes-modal-variant-creation-field', 'attributes', 'field', 'Variant Creation Field', 'attributes-modal-form', 4, TRUE, FALSE),

-- Modal Values Section
('attributes-modal-values-section', 'attributes', 'section', 'Attribute Values Section', 'attributes-modal-form', 5, TRUE, FALSE),
('attributes-modal-add-value-button', 'attributes', 'button', 'Add Value Button', 'attributes-modal-values-section', 1, TRUE, FALSE),
('attributes-modal-values-table', 'attributes', 'component', 'Values Table', 'attributes-modal-values-section', 2, TRUE, FALSE),

-- Modal Footer Section
('attributes-modal-footer', 'attributes', 'section', 'Modal Footer', 'attributes-modal', 3, TRUE, FALSE),
('attributes-modal-cancel-button', 'attributes', 'button', 'Cancel Button', 'attributes-modal-footer', 1, TRUE, FALSE),
('attributes-modal-save-button', 'attributes', 'button', 'Save Button', 'attributes-modal-footer', 2, TRUE, FALSE)

ON DUPLICATE KEY UPDATE
    page_id = VALUES(page_id),
    section_type = VALUES(section_type),
    section_name = VALUES(section_name),
    parent_section_id = VALUES(parent_section_id),
    display_order = VALUES(display_order),
    inherit_permissions = VALUES(inherit_permissions),
    override_parent = VALUES(override_parent);

-- ============================================
-- BATCH TRANSFERS PAGE SECTIONS
-- ============================================
INSERT INTO page_sections (section_id, page_id, section_type, section_name, parent_section_id, display_order, inherit_permissions, override_parent) VALUES
-- Header Section
('batch-header', 'batch', 'section', 'Page Header', NULL, 1, TRUE, FALSE),
('batch-header-title', 'batch', 'field', 'Page Title', 'batch-header', 1, TRUE, FALSE),
('batch-header-description', 'batch', 'field', 'Page Description', 'batch-header', 2, TRUE, FALSE),
('batch-header-new-button', 'batch', 'button', 'New Batch Button', 'batch-header', 3, TRUE, FALSE),

-- Statistics Section
('batch-stats-section', 'batch', 'section', 'Summary Cards', NULL, 2, TRUE, FALSE),
('batch-stat-total', 'batch', 'component', 'Total Batches Card', 'batch-stats-section', 1, TRUE, FALSE),
('batch-stat-draft', 'batch', 'component', 'Draft Batches Card', 'batch-stats-section', 2, TRUE, FALSE),
('batch-stat-in-progress', 'batch', 'component', 'In Progress Card', 'batch-stats-section', 3, TRUE, FALSE),
('batch-stat-completed', 'batch', 'component', 'Completed Card', 'batch-stats-section', 4, TRUE, FALSE),

-- Filters Section
('batch-filters-section', 'batch', 'section', 'Filters', NULL, 3, TRUE, FALSE),
('batch-search-input', 'batch', 'field', 'Search Input', 'batch-filters-section', 1, TRUE, FALSE),
('batch-status-filter', 'batch', 'field', 'Status Filter', 'batch-filters-section', 2, TRUE, FALSE),
('batch-dock-filter', 'batch', 'field', 'Dock Location Filter', 'batch-filters-section', 3, TRUE, FALSE),
('batch-responsible-filter', 'batch', 'field', 'Responsible Filter', 'batch-filters-section', 4, TRUE, FALSE),

-- Grid Section
('batch-grid-section', 'batch', 'section', 'Batch Cards Grid', NULL, 4, TRUE, FALSE),
('batch-card-item', 'batch', 'component', 'Batch Card', 'batch-grid-section', 1, TRUE, FALSE),

-- Empty State Section
('batch-empty-state', 'batch', 'section', 'Empty State', NULL, 5, TRUE, FALSE),

-- Modal Section
('batch-modal', 'batch', 'section', 'Batch Detail Modal', NULL, 6, TRUE, FALSE),
('batch-modal-header', 'batch', 'section', 'Modal Header', 'batch-modal', 1, TRUE, FALSE),
('batch-modal-title', 'batch', 'field', 'Modal Title', 'batch-modal-header', 1, TRUE, FALSE),
('batch-modal-close-button', 'batch', 'button', 'Close Button', 'batch-modal-header', 2, TRUE, FALSE),

-- Modal Content Section
('batch-modal-content', 'batch', 'section', 'Modal Content', 'batch-modal', 2, TRUE, FALSE),
('batch-modal-status-badge', 'batch', 'component', 'Status Badge', 'batch-modal-content', 1, TRUE, FALSE),
('batch-modal-edit-button', 'batch', 'button', 'Edit Batch Button', 'batch-modal-content', 2, TRUE, FALSE),
('batch-modal-info-section', 'batch', 'section', 'Batch Information', 'batch-modal-content', 3, TRUE, FALSE),
('batch-modal-transfers-table', 'batch', 'component', 'Transfers Table', 'batch-modal-content', 4, TRUE, FALSE)

ON DUPLICATE KEY UPDATE
    page_id = VALUES(page_id),
    section_type = VALUES(section_type),
    section_name = VALUES(section_name),
    parent_section_id = VALUES(parent_section_id),
    display_order = VALUES(display_order),
    inherit_permissions = VALUES(inherit_permissions),
    override_parent = VALUES(override_parent);




