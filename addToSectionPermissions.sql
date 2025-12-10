-- =============================================
-- SQL Script to populate the 'section_permissions' table
-- Sets default permissions for sections/fields in attributes and batch pages
-- =============================================
-- 
-- IMPORTANT: This script assumes role_id is VARCHAR(100) (run migration first)
-- Permissive by default: If no permissions are set, all roles can access
-- When permissions are set, only specified roles can access
--
-- Usage: mysql -u username -p database_name < addToSectionPermissions.sql
--
-- Note: Replace 'Admin', 'Manager', 'User' with actual role values from res_users.role
-- You can set permissions for multiple roles by adding more INSERT statements

-- ============================================
-- ATTRIBUTES PAGE SECTION PERMISSIONS
-- ============================================

-- Header Section - Allow all roles by default (no restrictions)
-- If you want to restrict, uncomment and set specific roles:
-- INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
-- ('attributes-header', 'Admin', TRUE, FALSE, FALSE),
-- ('attributes-header', 'Manager', TRUE, FALSE, FALSE);

-- Header Title - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-header-title', 'Admin', TRUE, FALSE, FALSE),
('attributes-header-title', 'Manager', TRUE, FALSE, FALSE),
('attributes-header-title', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Header Description - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-header-description', 'Admin', TRUE, FALSE, FALSE),
('attributes-header-description', 'Manager', TRUE, FALSE, FALSE),
('attributes-header-description', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Add Attribute Button - Execute permission (only Admin and Manager can add)
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-header-add-button', 'Admin', TRUE, FALSE, TRUE),
('attributes-header-add-button', 'Manager', TRUE, FALSE, TRUE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Statistics Section - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-stats-section', 'Admin', TRUE, FALSE, FALSE),
('attributes-stats-section', 'Manager', TRUE, FALSE, FALSE),
('attributes-stats-section', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Individual Stat Cards - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-stat-total', 'Admin', TRUE, FALSE, FALSE),
('attributes-stat-total', 'Manager', TRUE, FALSE, FALSE),
('attributes-stat-total', 'User', TRUE, FALSE, FALSE),
('attributes-stat-display-types', 'Admin', TRUE, FALSE, FALSE),
('attributes-stat-display-types', 'Manager', TRUE, FALSE, FALSE),
('attributes-stat-display-types', 'User', TRUE, FALSE, FALSE),
('attributes-stat-total-values', 'Admin', TRUE, FALSE, FALSE),
('attributes-stat-total-values', 'Manager', TRUE, FALSE, FALSE),
('attributes-stat-total-values', 'User', TRUE, FALSE, FALSE),
('attributes-stat-visible-filters', 'Admin', TRUE, FALSE, FALSE),
('attributes-stat-visible-filters', 'Manager', TRUE, FALSE, FALSE),
('attributes-stat-visible-filters', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Search Section - View and Edit (all roles can search)
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-search-section', 'Admin', TRUE, FALSE, FALSE),
('attributes-search-section', 'Manager', TRUE, FALSE, FALSE),
('attributes-search-section', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Search Input - Edit permission (all roles can type in search)
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-search-input', 'Admin', TRUE, TRUE, FALSE),
('attributes-search-input', 'Manager', TRUE, TRUE, FALSE),
('attributes-search-input', 'User', TRUE, TRUE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Attributes Grid Section - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-grid-section', 'Admin', TRUE, FALSE, FALSE),
('attributes-grid-section', 'Manager', TRUE, FALSE, FALSE),
('attributes-grid-section', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Grid Item (Attribute Card) - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-grid-item', 'Admin', TRUE, FALSE, FALSE),
('attributes-grid-item', 'Manager', TRUE, FALSE, FALSE),
('attributes-grid-item', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Empty State - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-empty-state', 'Admin', TRUE, FALSE, FALSE),
('attributes-empty-state', 'Manager', TRUE, FALSE, FALSE),
('attributes-empty-state', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Section - View only (Admin and Manager can open modal)
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-modal', 'Admin', TRUE, FALSE, FALSE),
('attributes-modal', 'Manager', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Header - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-modal-header', 'Admin', TRUE, FALSE, FALSE),
('attributes-modal-header', 'Manager', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Title - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-modal-title', 'Admin', TRUE, FALSE, FALSE),
('attributes-modal-title', 'Manager', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Close Button - Execute permission
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-modal-close-button', 'Admin', TRUE, FALSE, TRUE),
('attributes-modal-close-button', 'Manager', TRUE, FALSE, TRUE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Form - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-modal-form', 'Admin', TRUE, FALSE, FALSE),
('attributes-modal-form', 'Manager', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Name Field - View and Edit (Admin and Manager can edit)
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-modal-name-field', 'Admin', TRUE, TRUE, FALSE),
('attributes-modal-name-field', 'Manager', TRUE, TRUE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Filter Visibility Field - View and Edit
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-modal-filter-visibility-field', 'Admin', TRUE, TRUE, FALSE),
('attributes-modal-filter-visibility-field', 'Manager', TRUE, TRUE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Display Type Field - View and Edit
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-modal-display-type-field', 'Admin', TRUE, TRUE, FALSE),
('attributes-modal-display-type-field', 'Manager', TRUE, TRUE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Variant Creation Field - View and Edit
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-modal-variant-creation-field', 'Admin', TRUE, TRUE, FALSE),
('attributes-modal-variant-creation-field', 'Manager', TRUE, TRUE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Values Section - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-modal-values-section', 'Admin', TRUE, FALSE, FALSE),
('attributes-modal-values-section', 'Manager', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Add Value Button - Execute permission
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-modal-add-value-button', 'Admin', TRUE, FALSE, TRUE),
('attributes-modal-add-value-button', 'Manager', TRUE, FALSE, TRUE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Values Table - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-modal-values-table', 'Admin', TRUE, FALSE, FALSE),
('attributes-modal-values-table', 'Manager', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Footer - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-modal-footer', 'Admin', TRUE, FALSE, FALSE),
('attributes-modal-footer', 'Manager', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Cancel Button - Execute permission
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-modal-cancel-button', 'Admin', TRUE, FALSE, TRUE),
('attributes-modal-cancel-button', 'Manager', TRUE, FALSE, TRUE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Save Button - Execute permission (only Admin can save)
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('attributes-modal-save-button', 'Admin', TRUE, FALSE, TRUE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- ============================================
-- BATCH TRANSFERS PAGE SECTION PERMISSIONS
-- ============================================

-- Header Section - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-header', 'Admin', TRUE, FALSE, FALSE),
('batch-header', 'Manager', TRUE, FALSE, FALSE),
('batch-header', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Header Title - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-header-title', 'Admin', TRUE, FALSE, FALSE),
('batch-header-title', 'Manager', TRUE, FALSE, FALSE),
('batch-header-title', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Header Description - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-header-description', 'Admin', TRUE, FALSE, FALSE),
('batch-header-description', 'Manager', TRUE, FALSE, FALSE),
('batch-header-description', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- New Batch Button - Execute permission (only Admin and Manager can create)
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-header-new-button', 'Admin', TRUE, FALSE, TRUE),
('batch-header-new-button', 'Manager', TRUE, FALSE, TRUE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Stats Section - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-stats-section', 'Admin', TRUE, FALSE, FALSE),
('batch-stats-section', 'Manager', TRUE, FALSE, FALSE),
('batch-stats-section', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Individual Stat Cards - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-stat-total', 'Admin', TRUE, FALSE, FALSE),
('batch-stat-total', 'Manager', TRUE, FALSE, FALSE),
('batch-stat-total', 'User', TRUE, FALSE, FALSE),
('batch-stat-draft', 'Admin', TRUE, FALSE, FALSE),
('batch-stat-draft', 'Manager', TRUE, FALSE, FALSE),
('batch-stat-draft', 'User', TRUE, FALSE, FALSE),
('batch-stat-in-progress', 'Admin', TRUE, FALSE, FALSE),
('batch-stat-in-progress', 'Manager', TRUE, FALSE, FALSE),
('batch-stat-in-progress', 'User', TRUE, FALSE, FALSE),
('batch-stat-completed', 'Admin', TRUE, FALSE, FALSE),
('batch-stat-completed', 'Manager', TRUE, FALSE, FALSE),
('batch-stat-completed', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Filters Section - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-filters-section', 'Admin', TRUE, FALSE, FALSE),
('batch-filters-section', 'Manager', TRUE, FALSE, FALSE),
('batch-filters-section', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Search Input - Edit permission (all roles can search)
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-search-input', 'Admin', TRUE, TRUE, FALSE),
('batch-search-input', 'Manager', TRUE, TRUE, FALSE),
('batch-search-input', 'User', TRUE, TRUE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Status Filter - View and Edit
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-status-filter', 'Admin', TRUE, TRUE, FALSE),
('batch-status-filter', 'Manager', TRUE, TRUE, FALSE),
('batch-status-filter', 'User', TRUE, TRUE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Dock Filter - View and Edit
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-dock-filter', 'Admin', TRUE, TRUE, FALSE),
('batch-dock-filter', 'Manager', TRUE, TRUE, FALSE),
('batch-dock-filter', 'User', TRUE, TRUE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Responsible Filter - View and Edit
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-responsible-filter', 'Admin', TRUE, TRUE, FALSE),
('batch-responsible-filter', 'Manager', TRUE, TRUE, FALSE),
('batch-responsible-filter', 'User', TRUE, TRUE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Grid Section - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-grid-section', 'Admin', TRUE, FALSE, FALSE),
('batch-grid-section', 'Manager', TRUE, FALSE, FALSE),
('batch-grid-section', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Batch Card Item - View only (all roles can view batch cards)
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-card-item', 'Admin', TRUE, FALSE, FALSE),
('batch-card-item', 'Manager', TRUE, FALSE, FALSE),
('batch-card-item', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Empty State - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-empty-state', 'Admin', TRUE, FALSE, FALSE),
('batch-empty-state', 'Manager', TRUE, FALSE, FALSE),
('batch-empty-state', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Section - View only (all roles can open modal to view details)
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-modal', 'Admin', TRUE, FALSE, FALSE),
('batch-modal', 'Manager', TRUE, FALSE, FALSE),
('batch-modal', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Header - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-modal-header', 'Admin', TRUE, FALSE, FALSE),
('batch-modal-header', 'Manager', TRUE, FALSE, FALSE),
('batch-modal-header', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Title - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-modal-title', 'Admin', TRUE, FALSE, FALSE),
('batch-modal-title', 'Manager', TRUE, FALSE, FALSE),
('batch-modal-title', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Close Button - Execute permission
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-modal-close-button', 'Admin', TRUE, FALSE, TRUE),
('batch-modal-close-button', 'Manager', TRUE, FALSE, TRUE),
('batch-modal-close-button', 'User', TRUE, FALSE, TRUE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Content - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-modal-content', 'Admin', TRUE, FALSE, FALSE),
('batch-modal-content', 'Manager', TRUE, FALSE, FALSE),
('batch-modal-content', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Status Badge - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-modal-status-badge', 'Admin', TRUE, FALSE, FALSE),
('batch-modal-status-badge', 'Manager', TRUE, FALSE, FALSE),
('batch-modal-status-badge', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Edit Button - Execute permission (only Admin and Manager can edit)
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-modal-edit-button', 'Admin', TRUE, FALSE, TRUE),
('batch-modal-edit-button', 'Manager', TRUE, FALSE, TRUE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Info Section - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-modal-info-section', 'Admin', TRUE, FALSE, FALSE),
('batch-modal-info-section', 'Manager', TRUE, FALSE, FALSE),
('batch-modal-info-section', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- Modal Transfers Table - View only
INSERT INTO section_permissions (section_id, role_id, can_view, can_edit, can_execute) VALUES
('batch-modal-transfers-table', 'Admin', TRUE, FALSE, FALSE),
('batch-modal-transfers-table', 'Manager', TRUE, FALSE, FALSE),
('batch-modal-transfers-table', 'User', TRUE, FALSE, FALSE)
ON DUPLICATE KEY UPDATE can_view = VALUES(can_view), can_edit = VALUES(can_edit), can_execute = VALUES(can_execute);

-- ============================================
-- NOTES:
-- ============================================
-- 1. This script uses example roles: 'Admin', 'Manager', 'User'
--    Replace these with actual role values from your res_users.role column
--
-- 2. Permissive by default: If a section has no permissions set, all roles can access it
--    If permissions are set, only specified roles can access
--
-- 3. Permission types:
--    - can_view: Can see the section/field
--    - can_edit: Can modify the field (for inputs, forms)
--    - can_execute: Can click/activate (for buttons, actions)
--
-- 4. To add more roles, duplicate the INSERT statements with different role_id values
--
-- 5. To remove permissions for a role, delete the corresponding row or set all flags to FALSE
--
-- 6. You can manage these permissions via the admin page at /admin

