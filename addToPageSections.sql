-- =============================================
-- SQL Script to populate the 'page_sections' table
-- Maps all sections, components, and fields within each page
-- =============================================

-- ============================================
-- ATTRIBUTES PAGE SECTIONS
-- ============================================
INSERT INTO page_sections (section_id, page_id, section_type, section_name, parent_section_id, display_order, inherit_permissions, override_parent) VALUES
('attributes-header', 'attributes', 'section', 'Page Header', NULL, 1, TRUE, FALSE),
('attributes-header-title', 'attributes', 'field', 'Page Title', 'attributes-header', 1, TRUE, FALSE),
('attributes-header-description', 'attributes', 'field', 'Page Description', 'attributes-header', 2, TRUE, FALSE),
('attributes-header-add-button', 'attributes', 'button', 'Add Attribute Button', 'attributes-header', 3, TRUE, FALSE),
('attributes-stats-section', 'attributes', 'section', 'Statistics Cards', NULL, 2, TRUE, FALSE),
('attributes-stat-total', 'attributes', 'component', 'Total Attributes Card', 'attributes-stats-section', 1, TRUE, FALSE),
('attributes-stat-display-types', 'attributes', 'component', 'Display Types Card', 'attributes-stats-section', 2, TRUE, FALSE),
('attributes-stat-total-values', 'attributes', 'component', 'Total Values Card', 'attributes-stats-section', 3, TRUE, FALSE),
('attributes-stat-visible-filters', 'attributes', 'component', 'Visible Filters Card', 'attributes-stats-section', 4, TRUE, FALSE),
('attributes-search-section', 'attributes', 'section', 'Search Bar', NULL, 3, TRUE, FALSE),
('attributes-search-input', 'attributes', 'field', 'Search Input', 'attributes-search-section', 1, TRUE, FALSE),
('attributes-grid-section', 'attributes', 'section', 'Attributes Grid', NULL, 4, TRUE, FALSE),
('attributes-grid-item', 'attributes', 'component', 'Attribute Card', 'attributes-grid-section', 1, TRUE, FALSE),
('attributes-empty-state', 'attributes', 'section', 'Empty State', NULL, 5, TRUE, FALSE),
('attributes-modal', 'attributes', 'section', 'Attribute Modal', NULL, 6, TRUE, FALSE),
('attributes-modal-header', 'attributes', 'section', 'Modal Header', 'attributes-modal', 1, TRUE, FALSE),
('attributes-modal-title', 'attributes', 'field', 'Modal Title', 'attributes-modal-header', 1, TRUE, FALSE),
('attributes-modal-close-button', 'attributes', 'button', 'Close Button', 'attributes-modal-header', 2, TRUE, FALSE),
('attributes-modal-form', 'attributes', 'section', 'Modal Form', 'attributes-modal', 2, TRUE, FALSE),
('attributes-modal-name-field', 'attributes', 'field', 'Attribute Name Field', 'attributes-modal-form', 1, TRUE, FALSE),
('attributes-modal-filter-visibility-field', 'attributes', 'field', 'Filter Visibility Field', 'attributes-modal-form', 2, TRUE, FALSE),
('attributes-modal-display-type-field', 'attributes', 'field', 'Display Type Field', 'attributes-modal-form', 3, TRUE, FALSE),
('attributes-modal-variant-creation-field', 'attributes', 'field', 'Variant Creation Field', 'attributes-modal-form', 4, TRUE, FALSE),
('attributes-modal-values-section', 'attributes', 'section', 'Attribute Values Section', 'attributes-modal-form', 5, TRUE, FALSE),
('attributes-modal-add-value-button', 'attributes', 'button', 'Add Value Button', 'attributes-modal-values-section', 1, TRUE, FALSE),
('attributes-modal-values-table', 'attributes', 'component', 'Values Table', 'attributes-modal-values-section', 2, TRUE, FALSE),
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

-- Summary Cards Section
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

-- Batch Cards Grid Section
('batch-grid-section', 'batch', 'section', 'Batch Cards Grid', NULL, 4, TRUE, FALSE),
('batch-card-item', 'batch', 'component', 'Batch Card', 'batch-grid-section', 1, TRUE, FALSE),

-- Empty State Section
('batch-empty-state', 'batch', 'section', 'Empty State', NULL, 5, TRUE, FALSE),

-- Detail Modal Section
('batch-modal', 'batch', 'section', 'Batch Detail Modal', NULL, 6, TRUE, FALSE),
('batch-modal-header', 'batch', 'section', 'Modal Header', 'batch-modal', 1, TRUE, FALSE),
('batch-modal-title', 'batch', 'field', 'Modal Title', 'batch-modal-header', 1, TRUE, FALSE),
('batch-modal-close-button', 'batch', 'button', 'Close Button', 'batch-modal-header', 2, TRUE, FALSE),
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
-- ============================================
-- CATEGORIES PAGE SECTIONS
-- ============================================
INSERT INTO page_sections (section_id, page_id, section_type, section_name, parent_section_id, display_order, inherit_permissions, override_parent) VALUES
-- Header Section
('categories-header', 'categories', 'section', 'Page Header', NULL, 1, TRUE, FALSE),
('categories-header-title', 'categories', 'field', 'Page Title', 'categories-header', 1, TRUE, FALSE),
('categories-header-refresh-button', 'categories', 'button', 'Refresh Button', 'categories-header', 2, TRUE, FALSE),
('categories-header-add-button', 'categories', 'button', 'Add Category Button', 'categories-header', 3, TRUE, FALSE),

-- Search Section
('categories-search-section', 'categories', 'section', 'Search Bar', NULL, 2, TRUE, FALSE),
('categories-search-input', 'categories', 'field', 'Search Input', 'categories-search-section', 1, TRUE, FALSE),

-- Summary Cards Section
('categories-stats-section', 'categories', 'section', 'Summary Cards', NULL, 3, TRUE, FALSE),
('categories-stat-total', 'categories', 'component', 'Total Categories Card', 'categories-stats-section', 1, TRUE, FALSE),
('categories-stat-parent', 'categories', 'component', 'Parent Categories Card', 'categories-stats-section', 2, TRUE, FALSE),
('categories-stat-child', 'categories', 'component', 'Child Categories Card', 'categories-stats-section', 3, TRUE, FALSE),

-- Category Cards Grid Section
('categories-grid-section', 'categories', 'section', 'Category Cards Grid', NULL, 4, TRUE, FALSE),
('categories-card-item', 'categories', 'component', 'Category Card', 'categories-grid-section', 1, TRUE, FALSE),

-- Edit/Add Modal Section
('categories-modal', 'categories', 'section', 'Category Modal', NULL, 5, TRUE, FALSE),
('categories-modal-header', 'categories', 'section', 'Modal Header', 'categories-modal', 1, TRUE, FALSE),
('categories-modal-title', 'categories', 'field', 'Modal Title', 'categories-modal-header', 1, TRUE, FALSE),
('categories-modal-close-button', 'categories', 'button', 'Close Button', 'categories-modal-header', 2, TRUE, FALSE),
('categories-modal-form', 'categories', 'section', 'Modal Form', 'categories-modal', 2, TRUE, FALSE),
('categories-modal-name-field', 'categories', 'field', 'Category Name Field', 'categories-modal-form', 1, TRUE, FALSE),
('categories-modal-parent-field', 'categories', 'field', 'Parent Category Field', 'categories-modal-form', 2, TRUE, FALSE),
('categories-modal-logistics-section', 'categories', 'section', 'Logistics Section', 'categories-modal-form', 3, TRUE, FALSE),
('categories-modal-routes-field', 'categories', 'field', 'Routes Field', 'categories-modal-logistics-section', 1, TRUE, FALSE),
('categories-modal-removal-strategy-field', 'categories', 'field', 'Removal Strategy Field', 'categories-modal-logistics-section', 2, TRUE, FALSE),
('categories-modal-packaging-reserve-field', 'categories', 'field', 'Packaging Reserve Field', 'categories-modal-logistics-section', 3, TRUE, FALSE),
('categories-modal-valuation-section', 'categories', 'section', 'Inventory Valuation Section', 'categories-modal-form', 4, TRUE, FALSE),
('categories-modal-costing-method-field', 'categories', 'field', 'Costing Method Field', 'categories-modal-valuation-section', 1, TRUE, FALSE),
('categories-modal-footer', 'categories', 'section', 'Modal Footer', 'categories-modal', 3, TRUE, FALSE),
('categories-modal-cancel-button', 'categories', 'button', 'Cancel Button', 'categories-modal-footer', 1, TRUE, FALSE),
('categories-modal-save-button', 'categories', 'button', 'Save Button', 'categories-modal-footer', 2, TRUE, FALSE)

ON DUPLICATE KEY UPDATE
    page_id = VALUES(page_id),
    section_type = VALUES(section_type),
    section_name = VALUES(section_name),
    parent_section_id = VALUES(parent_section_id),
    display_order = VALUES(display_order),
    inherit_permissions = VALUES(inherit_permissions),
    override_parent = VALUES(override_parent);

-- ============================================
-- DASHBOARD PAGE SECTIONS
-- ============================================
INSERT INTO page_sections (section_id, page_id, section_type, section_name, parent_section_id, display_order, inherit_permissions, override_parent) VALUES
-- Header Section
('dashboard-header', 'dashboard', 'section', 'Page Header', NULL, 1, TRUE, FALSE),
('dashboard-header-title', 'dashboard', 'field', 'Dashboard Title', 'dashboard-header', 1, TRUE, FALSE),
('dashboard-header-description', 'dashboard', 'field', 'Dashboard Description', 'dashboard-header', 2, TRUE, FALSE),
('dashboard-header-add-widget-button', 'dashboard', 'button', 'Add Widget Button', 'dashboard-header', 3, TRUE, FALSE),

-- Stat Cards Section (Non-deletable)
('dashboard-stats-section', 'dashboard', 'section', 'Stat Cards', NULL, 2, TRUE, FALSE),
('dashboard-stat-revenue', 'dashboard', 'component', 'Total Revenue Card', 'dashboard-stats-section', 1, TRUE, FALSE),
('dashboard-stat-orders', 'dashboard', 'component', 'Total Orders Card', 'dashboard-stats-section', 2, TRUE, FALSE),
('dashboard-stat-products', 'dashboard', 'component', 'Products Card', 'dashboard-stats-section', 3, TRUE, FALSE),
('dashboard-stat-customers', 'dashboard', 'component', 'Customers Card', 'dashboard-stats-section', 4, TRUE, FALSE),

-- Charts Grid Section
('dashboard-charts-section', 'dashboard', 'section', 'Charts Grid', NULL, 3, TRUE, FALSE),
('dashboard-chart-item', 'dashboard', 'component', 'Chart Widget', 'dashboard-charts-section', 1, TRUE, FALSE),

-- Empty State Section
('dashboard-empty-state', 'dashboard', 'section', 'Empty State', NULL, 4, TRUE, FALSE),

-- Chart Type Modal Section
('dashboard-chart-modal', 'dashboard', 'section', 'Chart Type Modal', NULL, 5, TRUE, FALSE)

ON DUPLICATE KEY UPDATE
    page_id = VALUES(page_id),
    section_type = VALUES(section_type),
    section_name = VALUES(section_name),
    parent_section_id = VALUES(parent_section_id),
    display_order = VALUES(display_order),
    inherit_permissions = VALUES(inherit_permissions),
    override_parent = VALUES(override_parent);

-- ============================================
-- DELIVERIES PAGE SECTIONS
-- ============================================
INSERT INTO page_sections (section_id, page_id, section_type, section_name, parent_section_id, display_order, inherit_permissions, override_parent) VALUES
-- Header Section
('deliveries-header', 'deliveries', 'section', 'Page Header', NULL, 1, TRUE, FALSE),
('deliveries-header-title', 'deliveries', 'field', 'Page Title', 'deliveries-header', 1, TRUE, FALSE),
('deliveries-header-description', 'deliveries', 'field', 'Page Description', 'deliveries-header', 2, TRUE, FALSE),
('deliveries-header-new-button', 'deliveries', 'button', 'New Delivery Button', 'deliveries-header', 3, TRUE, FALSE),

-- Stats Cards Section
('deliveries-stats-section', 'deliveries', 'section', 'Statistics Cards', NULL, 2, TRUE, FALSE),
('deliveries-stat-total', 'deliveries', 'component', 'Total Deliveries Card', 'deliveries-stats-section', 1, TRUE, FALSE),
('deliveries-stat-draft', 'deliveries', 'component', 'Draft Deliveries Card', 'deliveries-stats-section', 2, TRUE, FALSE),
('deliveries-stat-scheduled-today', 'deliveries', 'component', 'Scheduled Today Card', 'deliveries-stats-section', 3, TRUE, FALSE),
('deliveries-stat-completed', 'deliveries', 'component', 'Completed Card', 'deliveries-stats-section', 4, TRUE, FALSE),

-- Filters Section
('deliveries-filters-section', 'deliveries', 'section', 'Filters', NULL, 3, TRUE, FALSE),
('deliveries-search-input', 'deliveries', 'field', 'Search Input', 'deliveries-filters-section', 1, TRUE, FALSE),
('deliveries-status-filter', 'deliveries', 'field', 'Status Filter', 'deliveries-filters-section', 2, TRUE, FALSE),
('deliveries-to-filter', 'deliveries', 'field', 'To Location Filter', 'deliveries-filters-section', 3, TRUE, FALSE),
('deliveries-from-filter', 'deliveries', 'field', 'From Location Filter', 'deliveries-filters-section', 4, TRUE, FALSE),

-- Delivery Cards Grid Section
('deliveries-grid-section', 'deliveries', 'section', 'Delivery Cards Grid', NULL, 4, TRUE, FALSE),
('deliveries-card-item', 'deliveries', 'component', 'Delivery Card', 'deliveries-grid-section', 1, TRUE, FALSE),

-- Empty State Section
('deliveries-empty-state', 'deliveries', 'section', 'Empty State', NULL, 5, TRUE, FALSE),

-- Edit Modal Section
('deliveries-modal', 'deliveries', 'section', 'Delivery Edit Modal', NULL, 6, TRUE, FALSE),
('deliveries-modal-content', 'deliveries', 'section', 'Modal Content', 'deliveries-modal', 1, TRUE, FALSE),

-- Success Modal Section
('deliveries-success-modal', 'deliveries', 'section', 'Success Modal', NULL, 7, TRUE, FALSE)

ON DUPLICATE KEY UPDATE
    page_id = VALUES(page_id),
    section_type = VALUES(section_type),
    section_name = VALUES(section_name),
    parent_section_id = VALUES(parent_section_id),
    display_order = VALUES(display_order),
    inherit_permissions = VALUES(inherit_permissions),
    override_parent = VALUES(override_parent);

-- ============================================
-- DELIVERY METHODS PAGE SECTIONS
-- ============================================
INSERT INTO page_sections (section_id, page_id, section_type, section_name, parent_section_id, display_order, inherit_permissions, override_parent) VALUES
-- Header Section
('delivery-methods-header', 'delivery-methods', 'section', 'Page Header', NULL, 1, TRUE, FALSE),
('delivery-methods-header-title', 'delivery-methods', 'field', 'Page Title', 'delivery-methods-header', 1, TRUE, FALSE),
('delivery-methods-header-description', 'delivery-methods', 'field', 'Page Description', 'delivery-methods-header', 2, TRUE, FALSE),
('delivery-methods-header-refresh-button', 'delivery-methods', 'button', 'Refresh Button', 'delivery-methods-header', 3, TRUE, FALSE),
('delivery-methods-header-add-button', 'delivery-methods', 'button', 'Add Delivery Method Button', 'delivery-methods-header', 4, TRUE, FALSE),

-- Stats Cards Section
('delivery-methods-stats-section', 'delivery-methods', 'section', 'Statistics Cards', NULL, 2, TRUE, FALSE),
('delivery-methods-stat-total', 'delivery-methods', 'component', 'Total Methods Card', 'delivery-methods-stats-section', 1, TRUE, FALSE),
('delivery-methods-stat-published', 'delivery-methods', 'component', 'Published Card', 'delivery-methods-stats-section', 2, TRUE, FALSE),
('delivery-methods-stat-average-price', 'delivery-methods', 'component', 'Average Price Card', 'delivery-methods-stats-section', 3, TRUE, FALSE),
('delivery-methods-stat-provider', 'delivery-methods', 'component', 'Most Used Provider Card', 'delivery-methods-stats-section', 4, TRUE, FALSE),

-- Search Section
('delivery-methods-search-section', 'delivery-methods', 'section', 'Search Bar', NULL, 3, TRUE, FALSE),
('delivery-methods-search-input', 'delivery-methods', 'field', 'Search Input', 'delivery-methods-search-section', 1, TRUE, FALSE),

-- Delivery Method Cards Grid Section
('delivery-methods-grid-section', 'delivery-methods', 'section', 'Delivery Method Cards Grid', NULL, 4, TRUE, FALSE),
('delivery-methods-card-item', 'delivery-methods', 'component', 'Delivery Method Card', 'delivery-methods-grid-section', 1, TRUE, FALSE),

-- Edit Modal Section
('delivery-methods-modal', 'delivery-methods', 'section', 'Delivery Method Modal', NULL, 5, TRUE, FALSE),
('delivery-methods-modal-header', 'delivery-methods', 'section', 'Modal Header', 'delivery-methods-modal', 1, TRUE, FALSE),
('delivery-methods-modal-title', 'delivery-methods', 'field', 'Modal Title', 'delivery-methods-modal-header', 1, TRUE, FALSE),
('delivery-methods-modal-close-button', 'delivery-methods', 'button', 'Close Button', 'delivery-methods-modal-header', 2, TRUE, FALSE),
('delivery-methods-modal-tabs', 'delivery-methods', 'section', 'Modal Tabs', 'delivery-methods-modal', 2, TRUE, FALSE),
('delivery-methods-modal-general-tab', 'delivery-methods', 'section', 'General Tab', 'delivery-methods-modal-tabs', 1, TRUE, FALSE),
('delivery-methods-modal-name-field', 'delivery-methods', 'field', 'Name Field', 'delivery-methods-modal-general-tab', 1, TRUE, FALSE),
('delivery-methods-modal-provider-field', 'delivery-methods', 'field', 'Provider Field', 'delivery-methods-modal-general-tab', 2, TRUE, FALSE),
('delivery-methods-modal-product-field', 'delivery-methods', 'field', 'Delivery Product Field', 'delivery-methods-modal-general-tab', 3, TRUE, FALSE),
('delivery-methods-modal-routes-field', 'delivery-methods', 'field', 'Routes Field', 'delivery-methods-modal-general-tab', 4, TRUE, FALSE),
('delivery-methods-modal-margin-field', 'delivery-methods', 'field', 'Margin Field', 'delivery-methods-modal-general-tab', 5, TRUE, FALSE),
('delivery-methods-modal-fixed-margin-field', 'delivery-methods', 'field', 'Fixed Margin Field', 'delivery-methods-modal-general-tab', 6, TRUE, FALSE),
('delivery-methods-modal-tracking-field', 'delivery-methods', 'field', 'Tracking Link Field', 'delivery-methods-modal-general-tab', 7, TRUE, FALSE),
('delivery-methods-modal-pricing-tab', 'delivery-methods', 'section', 'Pricing Tab', 'delivery-methods-modal-tabs', 2, TRUE, FALSE),
('delivery-methods-modal-pricing-rules-table', 'delivery-methods', 'component', 'Pricing Rules Table', 'delivery-methods-modal-pricing-tab', 1, TRUE, FALSE),
('delivery-methods-modal-add-rule-button', 'delivery-methods', 'button', 'Add Rule Button', 'delivery-methods-modal-pricing-tab', 2, TRUE, FALSE),
('delivery-methods-modal-availability-tab', 'delivery-methods', 'section', 'Availability Tab', 'delivery-methods-modal-tabs', 3, TRUE, FALSE),
('delivery-methods-modal-countries-field', 'delivery-methods', 'field', 'Countries Field', 'delivery-methods-modal-availability-tab', 1, TRUE, FALSE),
('delivery-methods-modal-states-field', 'delivery-methods', 'field', 'States Field', 'delivery-methods-modal-availability-tab', 2, TRUE, FALSE),
('delivery-methods-modal-zip-prefixes-field', 'delivery-methods', 'field', 'Zip Prefixes Field', 'delivery-methods-modal-availability-tab', 3, TRUE, FALSE),
('delivery-methods-modal-max-weight-field', 'delivery-methods', 'field', 'Max Weight Field', 'delivery-methods-modal-availability-tab', 4, TRUE, FALSE),
('delivery-methods-modal-max-volume-field', 'delivery-methods', 'field', 'Max Volume Field', 'delivery-methods-modal-availability-tab', 5, TRUE, FALSE),
('delivery-methods-modal-description-tab', 'delivery-methods', 'section', 'Description Tab', 'delivery-methods-modal-tabs', 4, TRUE, FALSE),
('delivery-methods-modal-description-field', 'delivery-methods', 'field', 'Description Textarea', 'delivery-methods-modal-description-tab', 1, TRUE, FALSE),
('delivery-methods-modal-footer', 'delivery-methods', 'section', 'Modal Footer', 'delivery-methods-modal', 3, TRUE, FALSE),
('delivery-methods-modal-cancel-button', 'delivery-methods', 'button', 'Cancel Button', 'delivery-methods-modal-footer', 1, TRUE, FALSE),
('delivery-methods-modal-save-button', 'delivery-methods', 'button', 'Save Button', 'delivery-methods-modal-footer', 2, TRUE, FALSE)

ON DUPLICATE KEY UPDATE
    page_id = VALUES(page_id),
    section_type = VALUES(section_type),
    section_name = VALUES(section_name),
    parent_section_id = VALUES(parent_section_id),
    display_order = VALUES(display_order),
    inherit_permissions = VALUES(inherit_permissions),
    override_parent = VALUES(override_parent);

-- ============================================
-- DROPSHIP PAGE SECTIONS
-- ============================================
INSERT INTO page_sections (section_id, page_id, section_type, section_name, parent_section_id, display_order, inherit_permissions, override_parent) VALUES
-- Header Section
('dropship-header', 'dropship', 'section', 'Page Header', NULL, 1, TRUE, FALSE),
('dropship-header-title', 'dropship', 'field', 'Page Title', 'dropship-header', 1, TRUE, FALSE),
('dropship-header-description', 'dropship', 'field', 'Page Description', 'dropship-header', 2, TRUE, FALSE),
('dropship-header-new-button', 'dropship', 'button', 'New Dropship Button', 'dropship-header', 3, TRUE, FALSE),

-- Stats Cards Section
('dropship-stats-section', 'dropship', 'section', 'Statistics Cards', NULL, 2, TRUE, FALSE),
('dropship-stat-total', 'dropship', 'component', 'Total Dropships Card', 'dropship-stats-section', 1, TRUE, FALSE),
('dropship-stat-draft', 'dropship', 'component', 'Draft Dropships Card', 'dropship-stats-section', 2, TRUE, FALSE),
('dropship-stat-scheduled-today', 'dropship', 'component', 'Scheduled Today Card', 'dropship-stats-section', 3, TRUE, FALSE),
('dropship-stat-completed', 'dropship', 'component', 'Completed Card', 'dropship-stats-section', 4, TRUE, FALSE),

-- Filters Section
('dropship-filters-section', 'dropship', 'section', 'Filters', NULL, 3, TRUE, FALSE),
('dropship-search-input', 'dropship', 'field', 'Search Input', 'dropship-filters-section', 1, TRUE, FALSE),
('dropship-status-filter', 'dropship', 'field', 'Status Filter', 'dropship-filters-section', 2, TRUE, FALSE),
('dropship-to-filter', 'dropship', 'field', 'To Location Filter', 'dropship-filters-section', 3, TRUE, FALSE),
('dropship-from-filter', 'dropship', 'field', 'From Location Filter', 'dropship-filters-section', 4, TRUE, FALSE),

-- Dropship Cards Grid Section
('dropship-grid-section', 'dropship', 'section', 'Dropship Cards Grid', NULL, 4, TRUE, FALSE),
('dropship-card-item', 'dropship', 'component', 'Dropship Card', 'dropship-grid-section', 1, TRUE, FALSE),

-- Empty State Section
('dropship-empty-state', 'dropship', 'section', 'Empty State', NULL, 5, TRUE, FALSE),

-- Detail Modal Section
('dropship-modal', 'dropship', 'section', 'Dropship Detail Modal', NULL, 6, TRUE, FALSE),
('dropship-modal-header', 'dropship', 'section', 'Modal Header', 'dropship-modal', 1, TRUE, FALSE),
('dropship-modal-title', 'dropship', 'field', 'Modal Title', 'dropship-modal-header', 1, TRUE, FALSE),
('dropship-modal-close-button', 'dropship', 'button', 'Close Button', 'dropship-modal-header', 2, TRUE, FALSE),
('dropship-modal-content', 'dropship', 'section', 'Modal Content', 'dropship-modal', 2, TRUE, FALSE),
('dropship-modal-status-badge', 'dropship', 'component', 'Status Badge', 'dropship-modal-content', 1, TRUE, FALSE),
('dropship-modal-edit-button', 'dropship', 'button', 'Edit Button', 'dropship-modal-content', 2, TRUE, FALSE),
('dropship-modal-info-section', 'dropship', 'section', 'Order Information', 'dropship-modal-content', 3, TRUE, FALSE),
('dropship-modal-transfer-section', 'dropship', 'section', 'Transfer Flow', 'dropship-modal-content', 4, TRUE, FALSE)

ON DUPLICATE KEY UPDATE
    page_id = VALUES(page_id),
    section_type = VALUES(section_type),
    section_name = VALUES(section_name),
    parent_section_id = VALUES(parent_section_id),
    display_order = VALUES(display_order),
    inherit_permissions = VALUES(inherit_permissions),
    override_parent = VALUES(override_parent);

-- ============================================
-- INTERNAL TRANSFERS PAGE SECTIONS
-- ============================================
INSERT INTO page_sections (section_id, page_id, section_type, section_name, parent_section_id, display_order, inherit_permissions, override_parent) VALUES
-- Header Section
('internal-header', 'internal', 'section', 'Page Header', NULL, 1, TRUE, FALSE),
('internal-header-title', 'internal', 'field', 'Page Title', 'internal-header', 1, TRUE, FALSE),
('internal-header-description', 'internal', 'field', 'Page Description', 'internal-header', 2, TRUE, FALSE),
('internal-header-new-button', 'internal', 'button', 'New Transfer Button', 'internal-header', 3, TRUE, FALSE),

-- Stats Cards Section
('internal-stats-section', 'internal', 'section', 'Statistics Cards', NULL, 2, TRUE, FALSE),
('internal-stat-total', 'internal', 'component', 'Total Transfers Card', 'internal-stats-section', 1, TRUE, FALSE),
('internal-stat-draft', 'internal', 'component', 'Draft Transfers Card', 'internal-stats-section', 2, TRUE, FALSE),
('internal-stat-scheduled-today', 'internal', 'component', 'Scheduled Today Card', 'internal-stats-section', 3, TRUE, FALSE),
('internal-stat-completed', 'internal', 'component', 'Completed Card', 'internal-stats-section', 4, TRUE, FALSE),

-- Filters Section
('internal-filters-section', 'internal', 'section', 'Filters', NULL, 3, TRUE, FALSE),
('internal-search-input', 'internal', 'field', 'Search Input', 'internal-filters-section', 1, TRUE, FALSE),
('internal-status-filter', 'internal', 'field', 'Status Filter', 'internal-filters-section', 2, TRUE, FALSE),
('internal-to-filter', 'internal', 'field', 'To Location Filter', 'internal-filters-section', 3, TRUE, FALSE),
('internal-from-filter', 'internal', 'field', 'From Location Filter', 'internal-filters-section', 4, TRUE, FALSE),

-- Transfer Cards Grid Section
('internal-grid-section', 'internal', 'section', 'Transfer Cards Grid', NULL, 4, TRUE, FALSE),
('internal-card-item', 'internal', 'component', 'Transfer Card', 'internal-grid-section', 1, TRUE, FALSE),

-- Empty State Section
('internal-empty-state', 'internal', 'section', 'Empty State', NULL, 5, TRUE, FALSE),

-- Detail Modal Section
('internal-modal', 'internal', 'section', 'Transfer Detail Modal', NULL, 6, TRUE, FALSE),
('internal-modal-header', 'internal', 'section', 'Modal Header', 'internal-modal', 1, TRUE, FALSE),
('internal-modal-title', 'internal', 'field', 'Modal Title', 'internal-modal-header', 1, TRUE, FALSE),
('internal-modal-close-button', 'internal', 'button', 'Close Button', 'internal-modal-header', 2, TRUE, FALSE),
('internal-modal-content', 'internal', 'section', 'Modal Content', 'internal-modal', 2, TRUE, FALSE),
('internal-modal-status-badge', 'internal', 'component', 'Status Badge', 'internal-modal-content', 1, TRUE, FALSE),
('internal-modal-edit-button', 'internal', 'button', 'Edit Transfer Button', 'internal-modal-content', 2, TRUE, FALSE),
('internal-modal-info-section', 'internal', 'section', 'Transfer Information', 'internal-modal-content', 3, TRUE, FALSE),
('internal-modal-flow-section', 'internal', 'section', 'Transfer Flow', 'internal-modal-content', 4, TRUE, FALSE),
('internal-modal-operations-table', 'internal', 'component', 'Operations Table', 'internal-modal-content', 5, TRUE, FALSE)

ON DUPLICATE KEY UPDATE
    page_id = VALUES(page_id),
    section_type = VALUES(section_type),
    section_name = VALUES(section_name),
    parent_section_id = VALUES(parent_section_id),
    display_order = VALUES(display_order),
    inherit_permissions = VALUES(inherit_permissions),
    override_parent = VALUES(override_parent);

-- ============================================
-- INVENTORY PAGE SECTIONS
-- ============================================
INSERT INTO page_sections (section_id, page_id, section_type, section_name, parent_section_id, display_order, inherit_permissions, override_parent) VALUES
-- Header Section
('inventory-header', 'inventory', 'section', 'Page Header', NULL, 1, TRUE, FALSE),
('inventory-header-title', 'inventory', 'field', 'Page Title', 'inventory-header', 1, TRUE, FALSE),
('inventory-header-description', 'inventory', 'field', 'Page Description', 'inventory-header', 2, TRUE, FALSE),
('inventory-header-refresh-button', 'inventory', 'button', 'Refresh Button', 'inventory-header', 3, TRUE, FALSE),
('inventory-header-models-button', 'inventory', 'button', 'Models Button', 'inventory-header', 4, TRUE, FALSE),
('inventory-header-signout-button', 'inventory', 'button', 'Sign Out Button', 'inventory-header', 5, TRUE, FALSE),

-- Products Table Section
('inventory-table-section', 'inventory', 'section', 'Products Table', NULL, 2, TRUE, FALSE),
('inventory-table', 'inventory', 'component', 'Product Records Table', 'inventory-table-section', 1, TRUE, FALSE),

-- Empty State Section
('inventory-empty-state', 'inventory', 'section', 'Empty State', NULL, 3, TRUE, FALSE)

ON DUPLICATE KEY UPDATE
    page_id = VALUES(page_id),
    section_type = VALUES(section_type),
    section_name = VALUES(section_name),
    parent_section_id = VALUES(parent_section_id),
    display_order = VALUES(display_order),
    inherit_permissions = VALUES(inherit_permissions),
    override_parent = VALUES(override_parent);

-- ============================================
-- LANDING COSTS PAGE SECTIONS
-- ============================================
INSERT INTO page_sections (section_id, page_id, section_type, section_name, parent_section_id, display_order, inherit_permissions, override_parent) VALUES
-- Header Section
('landing-costs-header', 'landing-costs', 'section', 'Page Header', NULL, 1, TRUE, FALSE),
('landing-costs-header-title', 'landing-costs', 'field', 'Page Title', 'landing-costs-header', 1, TRUE, FALSE),
('landing-costs-header-description', 'landing-costs', 'field', 'Page Description', 'landing-costs-header', 2, TRUE, FALSE),
('landing-costs-header-new-button', 'landing-costs', 'button', 'New Landed Cost Button', 'landing-costs-header', 3, TRUE, FALSE),

-- Stats Cards Section
('landing-costs-stats-section', 'landing-costs', 'section', 'Statistics Cards', NULL, 2, TRUE, FALSE),
('landing-costs-stat-total', 'landing-costs', 'component', 'Total Costs Card', 'landing-costs-stats-section', 1, TRUE, FALSE),
('landing-costs-stat-draft', 'landing-costs', 'component', 'Draft Card', 'landing-costs-stats-section', 2, TRUE, FALSE),
('landing-costs-stat-posted-month', 'landing-costs', 'component', 'Posted This Month Card', 'landing-costs-stats-section', 3, TRUE, FALSE),
('landing-costs-stat-total-amount', 'landing-costs', 'component', 'Total Amount Card', 'landing-costs-stats-section', 4, TRUE, FALSE),

-- Filters Section
('landing-costs-filters-section', 'landing-costs', 'section', 'Filters', NULL, 3, TRUE, FALSE),
('landing-costs-search-input', 'landing-costs', 'field', 'Search Input', 'landing-costs-filters-section', 1, TRUE, FALSE),
('landing-costs-status-filter', 'landing-costs', 'field', 'Status Filter', 'landing-costs-filters-section', 2, TRUE, FALSE),
('landing-costs-apply-on-filter', 'landing-costs', 'field', 'Apply On Filter', 'landing-costs-filters-section', 3, TRUE, FALSE),
('landing-costs-vendor-bill-filter', 'landing-costs', 'field', 'Vendor Bill Filter', 'landing-costs-filters-section', 4, TRUE, FALSE),

-- Landing Cost Cards Grid Section
('landing-costs-grid-section', 'landing-costs', 'section', 'Landing Cost Cards Grid', NULL, 4, TRUE, FALSE),
('landing-costs-card-item', 'landing-costs', 'component', 'Landing Cost Card', 'landing-costs-grid-section', 1, TRUE, FALSE),

-- Empty State Section
('landing-costs-empty-state', 'landing-costs', 'section', 'Empty State', NULL, 5, TRUE, FALSE),

-- Edit Modal Section
('landing-costs-modal', 'landing-costs', 'section', 'Landed Cost Modal', NULL, 6, TRUE, FALSE),
('landing-costs-modal-header', 'landing-costs', 'section', 'Modal Header', 'landing-costs-modal', 1, TRUE, FALSE),
('landing-costs-modal-title', 'landing-costs', 'field', 'Modal Title', 'landing-costs-modal-header', 1, TRUE, FALSE),
('landing-costs-modal-close-button', 'landing-costs', 'button', 'Close Button', 'landing-costs-modal-header', 2, TRUE, FALSE),
('landing-costs-modal-form', 'landing-costs', 'section', 'Modal Form', 'landing-costs-modal', 2, TRUE, FALSE),
('landing-costs-modal-name-field', 'landing-costs', 'field', 'Name Field', 'landing-costs-modal-form', 1, TRUE, FALSE),
('landing-costs-modal-date-field', 'landing-costs', 'field', 'Date Field', 'landing-costs-modal-form', 2, TRUE, FALSE),
('landing-costs-modal-journal-field', 'landing-costs', 'field', 'Journal Field', 'landing-costs-modal-form', 3, TRUE, FALSE),
('landing-costs-modal-apply-on-field', 'landing-costs', 'field', 'Apply On Field', 'landing-costs-modal-form', 4, TRUE, FALSE),
('landing-costs-modal-vendor-bill-field', 'landing-costs', 'field', 'Vendor Bill Field', 'landing-costs-modal-form', 5, TRUE, FALSE),
('landing-costs-modal-picking-field', 'landing-costs', 'field', 'Picking Field', 'landing-costs-modal-form', 6, TRUE, FALSE),
('landing-costs-modal-costs-section', 'landing-costs', 'section', 'Additional Costs Section', 'landing-costs-modal-form', 7, TRUE, FALSE),
('landing-costs-modal-costs-table', 'landing-costs', 'component', 'Costs Table', 'landing-costs-modal-costs-section', 1, TRUE, FALSE),
('landing-costs-modal-add-line-button', 'landing-costs', 'button', 'Add Line Button', 'landing-costs-modal-costs-section', 2, TRUE, FALSE),
('landing-costs-modal-footer', 'landing-costs', 'section', 'Modal Footer', 'landing-costs-modal', 3, TRUE, FALSE),
('landing-costs-modal-close-button-footer', 'landing-costs', 'button', 'Close Button', 'landing-costs-modal-footer', 1, TRUE, FALSE),
('landing-costs-modal-save-button', 'landing-costs', 'button', 'Save Button', 'landing-costs-modal-footer', 2, TRUE, FALSE)

ON DUPLICATE KEY UPDATE
    page_id = VALUES(page_id),
    section_type = VALUES(section_type),
    section_name = VALUES(section_name),
    parent_section_id = VALUES(parent_section_id),
    display_order = VALUES(display_order),
    inherit_permissions = VALUES(inherit_permissions),
    override_parent = VALUES(override_parent);

-- ============================================
-- LOCATIONS PAGE SECTIONS
-- ============================================
INSERT INTO page_sections (section_id, page_id, section_type, section_name, parent_section_id, display_order, inherit_permissions, override_parent) VALUES
-- Header Section
('locations-header', 'locations', 'section', 'Page Header', NULL, 1, TRUE, FALSE),
('locations-header-title', 'locations', 'field', 'Page Title', 'locations-header', 1, TRUE, FALSE),
('locations-header-description', 'locations', 'field', 'Page Description', 'locations-header', 2, TRUE, FALSE),
('locations-header-create-button', 'locations', 'button', 'Create Location Button', 'locations-header', 3, TRUE, FALSE),

-- Stats Cards Section
('locations-stats-section', 'locations', 'section', 'Statistics Cards', NULL, 2, TRUE, FALSE),
('locations-stat-total', 'locations', 'component', 'Total Locations Card', 'locations-stats-section', 1, TRUE, FALSE),
('locations-stat-items', 'locations', 'component', 'Total Items Card', 'locations-stats-section', 2, TRUE, FALSE),
('locations-stat-value', 'locations', 'component', 'Total Value Card', 'locations-stats-section', 3, TRUE, FALSE),
('locations-stat-capacity', 'locations', 'component', 'Avg Capacity Card', 'locations-stats-section', 4, TRUE, FALSE),

-- Filters Section
('locations-filters-section', 'locations', 'section', 'Filters', NULL, 3, TRUE, FALSE),
('locations-search-input', 'locations', 'field', 'Search Input', 'locations-filters-section', 1, TRUE, FALSE),
('locations-type-filter', 'locations', 'field', 'Location Type Filter', 'locations-filters-section', 2, TRUE, FALSE),
('locations-category-filter', 'locations', 'field', 'Storage Category Filter', 'locations-filters-section', 3, TRUE, FALSE),

-- Location Cards Grid Section
('locations-grid-section', 'locations', 'section', 'Location Cards Grid', NULL, 4, TRUE, FALSE),
('locations-card-item', 'locations', 'component', 'Location Card', 'locations-grid-section', 1, TRUE, FALSE),
('locations-card-edit-button', 'locations', 'button', 'Edit Button', 'locations-card-item', 1, TRUE, FALSE),

-- Empty State Section
('locations-empty-state', 'locations', 'section', 'Empty State', NULL, 5, TRUE, FALSE),

-- Create/Edit Modal Section
('locations-modal', 'locations', 'section', 'Location Modal', NULL, 6, TRUE, FALSE),
('locations-modal-header', 'locations', 'section', 'Modal Header', 'locations-modal', 1, TRUE, FALSE),
('locations-modal-title', 'locations', 'field', 'Modal Title', 'locations-modal-header', 1, TRUE, FALSE),
('locations-modal-close-button', 'locations', 'button', 'Close Button', 'locations-modal-header', 2, TRUE, FALSE),
('locations-modal-form', 'locations', 'section', 'Modal Form', 'locations-modal', 2, TRUE, FALSE),
('locations-modal-name-field', 'locations', 'field', 'Name Field', 'locations-modal-form', 1, TRUE, FALSE),
('locations-modal-parent-field', 'locations', 'field', 'Parent Location Field', 'locations-modal-form', 2, TRUE, FALSE),
('locations-modal-usage-field', 'locations', 'field', 'Location Type Field', 'locations-modal-form', 3, TRUE, FALSE),
('locations-modal-storage-category-field', 'locations', 'field', 'Storage Category Field', 'locations-modal-form', 4, TRUE, FALSE),
('locations-modal-scrap-checkbox', 'locations', 'field', 'Scrap Location Checkbox', 'locations-modal-form', 5, TRUE, FALSE),
('locations-modal-dock-checkbox', 'locations', 'field', 'Dock Location Checkbox', 'locations-modal-form', 6, TRUE, FALSE),
('locations-modal-replenish-checkbox', 'locations', 'field', 'Replenish Location Checkbox', 'locations-modal-form', 7, TRUE, FALSE),
('locations-modal-frequency-field', 'locations', 'field', 'Inventory Frequency Field', 'locations-modal-form', 8, TRUE, FALSE),
('locations-modal-removal-strategy-field', 'locations', 'field', 'Removal Strategy Field', 'locations-modal-form', 9, TRUE, FALSE),
('locations-modal-comment-field', 'locations', 'field', 'External Note Field', 'locations-modal-form', 10, TRUE, FALSE),
('locations-modal-footer', 'locations', 'section', 'Modal Footer', 'locations-modal', 3, TRUE, FALSE),
('locations-modal-cancel-button', 'locations', 'button', 'Cancel Button', 'locations-modal-footer', 1, TRUE, FALSE),
('locations-modal-save-button', 'locations', 'button', 'Save Button', 'locations-modal-footer', 2, TRUE, FALSE)

ON DUPLICATE KEY UPDATE
    page_id = VALUES(page_id),
    section_type = VALUES(section_type),
    section_name = VALUES(section_name),
    parent_section_id = VALUES(parent_section_id),
    display_order = VALUES(display_order),
    inherit_permissions = VALUES(inherit_permissions),
    override_parent = VALUES(override_parent);

