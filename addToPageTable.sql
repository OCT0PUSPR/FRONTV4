-- =============================================
-- SQL Script to populate the 'pages' table
-- Maps all frontend pages to the security system
-- =============================================

-- Insert page records for all frontend pages
INSERT INTO pages (page_id, page_name, page_route, description, is_active) VALUES
-- Attributes Page
('attributes', 'Product Attributes', '/attributes', 'Manage product attributes for variant creation and filtering', TRUE),

-- Batch Transfers Page
('batch', 'Batch Transfers', '/batch', 'Manage wave, batch, and cluster transfer operations', TRUE),

-- Categories Page
('categories', 'Product Categories', '/categories', 'Manage product categories and their hierarchy', TRUE),

-- Dashboard Page
('dashboard', 'Dashboard', '/dashboard', 'Monitor your key metrics and insights', TRUE),

-- Deliveries Page
('deliveries', 'Transfer Deliveries', '/deliveries', 'Manage and track outbound transfer deliveries', TRUE),

-- Delivery Methods Page
('delivery-methods', 'Delivery Methods', '/delivery-methods', 'Manage shipping methods and pricing rules', TRUE),

-- Dropship Page
('dropship', 'Transfer Dropships', '/dropship', 'Manage dropship operations and vendor-to-customer deliveries', TRUE),

-- Internal Transfers Page
('internal', 'Internal Transfers', '/internal', 'Manage internal warehouse transfers and movements', TRUE),

-- Inventory Page
('inventory', 'Warehouse Inventory', '/inventory', 'Manage your products and stock levels', TRUE),

-- Landing Costs Page
('landing-costs', 'Landed Costs', '/landing-costs', 'Manage additional costs for inventory valuation', TRUE),

-- Locations Page
('locations', 'Warehouse Locations', '/locations', 'Monitor inventory across all warehouse locations', TRUE)

ON DUPLICATE KEY UPDATE
    page_name = VALUES(page_name),
    page_route = VALUES(page_route),
    description = VALUES(description),
    is_active = VALUES(is_active),
    updated_at = CURRENT_TIMESTAMP;

