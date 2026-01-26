# Physical Inventory Management System
## Product Requirements Document (PRD)

**Version:** 1.0
**Date:** January 23, 2026
**Status:** Draft
**Author:** Claude (AI Assistant)
**Stakeholder:** Product Owner

---

## 1. Executive Summary

### 1.1 Purpose
This document outlines the requirements for a comprehensive Physical Inventory Management System that enables warehouse teams to conduct inventory audits using RFID handheld devices, compare scanned quantities against system records, and reconcile discrepancies through a structured validation workflow.

### 1.2 Problem Statement
The current Physical Inventory page is non-functional—it displays static `stock.quant` data with a local-only "counted quantity" that does not persist or integrate with Odoo. There is no support for:
- Creating formal inventory count orders
- RFID/barcode scanning integration
- Discrepancy management workflow
- Audit trails and compliance reporting

### 1.3 Solution Overview
Build a complete Physical Inventory system with:
- **Count Order Management**: Create, schedule, and manage inventory count orders
- **RFID Integration**: API endpoints for handheld devices to upload scan results
- **Discrepancy Workflow**: Review, approve, or reject variances with reason codes
- **Two-way Odoo Sync**: Validated adjustments sync to Odoo's `stock.quant` and `stock.move`
- **Enterprise Scale**: Support for 100,000+ items per scan batch

---

## 2. Goals & Success Metrics

### 2.1 Business Goals
| Goal | Description |
|------|-------------|
| Inventory Accuracy | Increase inventory accuracy from current unknown baseline to >98% |
| Audit Compliance | Maintain complete audit trail for all inventory adjustments |
| Operational Efficiency | Reduce manual count time by 70% through RFID automation |
| Visibility | Real-time visibility into count progress and discrepancies |

### 2.2 Success Metrics
- Count order completion rate
- Average time from order creation to validation
- Discrepancy rate (items with variance / total items)
- Adjustment reversal rate (indicator of validation quality)
- System uptime for RFID API (target: 99.9%)

---

## 3. User Roles & Permissions

### 3.1 Role Definitions

| Role | Description | Permissions |
|------|-------------|-------------|
| **Counter** | Warehouse staff with RFID handheld devices | View assigned orders, upload scans, view own history |
| **Manager** | Warehouse supervisors and managers | All Counter permissions + Create/edit orders, validate/reject, manage discrepancies, assign counters |
| **Auditor** | Finance/compliance team members | Read-only access to all orders, reports, audit trails |

### 3.2 Permission Matrix

| Action | Counter | Manager | Auditor |
|--------|:-------:|:-------:|:-------:|
| View count orders | ✓ (assigned) | ✓ (all) | ✓ (all) |
| Create count order | ✗ | ✓ | ✗ |
| Edit count order | ✗ | ✓ | ✗ |
| Upload RFID scans | ✓ | ✓ | ✗ |
| View discrepancies | ✓ (own) | ✓ (all) | ✓ (all) |
| Approve/reject discrepancies | ✗ | ✓ | ✗ |
| Validate count order | ✗ | ✓ | ✗ |
| Reverse validated adjustment | ✗ | ✓ (with approval) | ✗ |
| View reports | ✗ | ✓ | ✓ |
| Export data | ✗ | ✓ | ✓ |
| Configure reason codes | ✗ | ✓ | ✗ |

---

## 4. System Architecture

### 4.1 Data Storage Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐      ┌──────────────────────┐         │
│  │      MariaDB         │      │        Odoo          │         │
│  │  (Work-in-Progress)  │      │   (Source of Truth)  │         │
│  ├──────────────────────┤      ├──────────────────────┤         │
│  │ • scan_orders        │      │ • stock.quant        │         │
│  │ • scan_order_lines   │ ───► │ • stock.move         │         │
│  │ • scan_uploads       │ sync │ • stock.lot          │         │
│  │ • discrepancies      │      │ • stock.location     │         │
│  │ • reason_codes       │ ◄─── │ • product.product    │         │
│  │ • audit_logs         │      │                      │         │
│  │ • unknown_tags       │      │                      │         │
│  └──────────────────────┘      └──────────────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Database Schema (MariaDB)

```sql
-- Scan Order (Count Order)
CREATE TABLE scan_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reference VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    status ENUM('draft', 'scheduled', 'in_progress', 'pending_review', 'validated', 'rejected', 'cancelled') DEFAULT 'draft',

    -- Scope
    scope_type ENUM('full_warehouse', 'locations', 'categories', 'mixed') NOT NULL,
    location_ids JSON,  -- Array of location IDs
    category_ids JSON,  -- Array of product category IDs

    -- Scheduling
    scheduled_date DATETIME,
    recurring_rule VARCHAR(50),  -- e.g., 'monthly', 'weekly'
    next_occurrence DATETIME,

    -- Configuration
    is_blind_count BOOLEAN DEFAULT FALSE,
    timeout_days INT DEFAULT NULL,

    -- Assignment
    responsible_user_id INT,
    assigned_counter_ids JSON,  -- Array of user IDs

    -- Timestamps
    started_at DATETIME,
    completed_at DATETIME,
    validated_at DATETIME,
    validated_by INT,

    -- Audit
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,

    -- Odoo sync
    odoo_inventory_id INT,  -- Reference to stock.inventory if synced

    INDEX idx_status (status),
    INDEX idx_scheduled (scheduled_date),
    INDEX idx_responsible (responsible_user_id)
);

-- Scan Order Lines (Expected vs Counted per location/product)
CREATE TABLE scan_order_lines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    scan_order_id INT NOT NULL,

    -- Product/Location reference
    product_id INT NOT NULL,
    location_id INT NOT NULL,
    lot_id INT,  -- Also serves as RFID tag reference

    -- Quantities
    expected_qty DECIMAL(16,4) DEFAULT 0,
    counted_qty DECIMAL(16,4) DEFAULT NULL,
    difference DECIMAL(16,4) GENERATED ALWAYS AS (COALESCE(counted_qty, 0) - expected_qty) STORED,

    -- Status
    is_counted BOOLEAN DEFAULT FALSE,
    is_missing BOOLEAN DEFAULT FALSE,  -- Expected but not found
    is_misplaced BOOLEAN DEFAULT FALSE,  -- Found in wrong location
    found_location_id INT,  -- Where item was actually found (if misplaced)

    -- Discrepancy handling
    discrepancy_status ENUM('none', 'pending', 'approved', 'rejected') DEFAULT 'none',
    reason_code_id INT,
    discrepancy_notes TEXT,
    reviewed_by INT,
    reviewed_at DATETIME,

    -- Audit
    last_scanned_at DATETIME,
    scanned_by INT,

    FOREIGN KEY (scan_order_id) REFERENCES scan_orders(id) ON DELETE CASCADE,
    INDEX idx_order_product (scan_order_id, product_id),
    INDEX idx_location (location_id),
    INDEX idx_discrepancy (discrepancy_status)
);

-- RFID Scan Uploads (Raw upload batches)
CREATE TABLE scan_uploads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    scan_order_id INT NOT NULL,

    -- Upload metadata
    upload_reference VARCHAR(100) UNIQUE,
    device_id VARCHAR(100),
    uploaded_by INT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Statistics
    total_scans INT DEFAULT 0,
    matched_scans INT DEFAULT 0,
    unknown_scans INT DEFAULT 0,

    -- Status
    status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
    error_message TEXT,

    FOREIGN KEY (scan_order_id) REFERENCES scan_orders(id) ON DELETE CASCADE,
    INDEX idx_order (scan_order_id),
    INDEX idx_uploaded (uploaded_at)
);

-- Individual Scan Records
CREATE TABLE scan_records (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    upload_id INT NOT NULL,

    -- Scan data from RFID device
    rfid_tag_id VARCHAR(100) NOT NULL,  -- Also maps to lot_id in Odoo
    location_barcode VARCHAR(100),
    scanned_location_id INT,
    scanned_at DATETIME NOT NULL,
    device_id VARCHAR(100),
    signal_strength INT,  -- RSSI value

    -- Matching result
    is_matched BOOLEAN DEFAULT FALSE,
    matched_product_id INT,
    matched_lot_id INT,
    matched_line_id INT,  -- Reference to scan_order_lines

    FOREIGN KEY (upload_id) REFERENCES scan_uploads(id) ON DELETE CASCADE,
    INDEX idx_upload (upload_id),
    INDEX idx_rfid (rfid_tag_id),
    INDEX idx_location (scanned_location_id)
);

-- Unknown Tags (RFID tags that couldn't be matched)
CREATE TABLE unknown_tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    scan_order_id INT NOT NULL,
    upload_id INT NOT NULL,

    rfid_tag_id VARCHAR(100) NOT NULL,
    scanned_location_id INT,
    scanned_at DATETIME,
    device_id VARCHAR(100),

    -- Resolution
    is_resolved BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT,
    resolved_by INT,
    resolved_at DATETIME,

    FOREIGN KEY (scan_order_id) REFERENCES scan_orders(id) ON DELETE CASCADE,
    INDEX idx_order (scan_order_id),
    INDEX idx_tag (rfid_tag_id)
);

-- Reason Codes for Discrepancies
CREATE TABLE reason_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    is_system BOOLEAN DEFAULT FALSE,  -- System-provided vs custom
    is_active BOOLEAN DEFAULT TRUE,

    category ENUM('shortage', 'surplus', 'misplaced', 'other') NOT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_category (category),
    INDEX idx_active (is_active)
);

-- Default reason codes
INSERT INTO reason_codes (code, name, category, is_system) VALUES
('DAMAGED', 'Damaged/Destroyed', 'shortage', TRUE),
('STOLEN', 'Lost/Stolen', 'shortage', TRUE),
('MISPLACED', 'Misplaced/Wrong Location', 'misplaced', TRUE),
('COUNT_ERROR', 'Count Error', 'other', TRUE),
('SYSTEM_ERROR', 'System Data Entry Error', 'other', TRUE),
('EXPIRED', 'Expired/Disposed', 'shortage', TRUE),
('RETURNED', 'Customer Return Not Entered', 'surplus', TRUE),
('SAMPLE', 'Sample/Demo Use', 'shortage', TRUE),
('RECEIVED', 'Received But Not Entered', 'surplus', TRUE),
('QUALITY_HOLD', 'Quality Hold/Quarantine', 'other', TRUE);

-- Audit Log for all changes
CREATE TABLE inventory_audit_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    -- What changed
    entity_type ENUM('scan_order', 'scan_line', 'discrepancy', 'reversal') NOT NULL,
    entity_id INT NOT NULL,
    action ENUM('created', 'updated', 'validated', 'rejected', 'reversed', 'synced') NOT NULL,

    -- Change details
    old_values JSON,
    new_values JSON,

    -- Who and when
    performed_by INT NOT NULL,
    performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Additional context
    reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,

    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_performed (performed_at),
    INDEX idx_user (performed_by)
);

-- Reversal Records
CREATE TABLE adjustment_reversals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    scan_order_id INT NOT NULL,

    -- Approval workflow
    requested_by INT NOT NULL,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL,

    approved_by INT,
    approved_at DATETIME,

    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    rejection_reason TEXT,

    -- Odoo sync
    reversal_move_ids JSON,  -- stock.move IDs created for reversal

    FOREIGN KEY (scan_order_id) REFERENCES scan_orders(id),
    INDEX idx_status (status),
    INDEX idx_order (scan_order_id)
);
```

---

## 5. Workflow & States

### 5.1 Count Order State Machine

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    ▼                                         │
┌─────────┐    ┌───────────┐    ┌─────────────┐    ┌─────────────────┐
│  DRAFT  │───►│ SCHEDULED │───►│ IN_PROGRESS │───►│ PENDING_REVIEW  │
└─────────┘    └───────────┘    └─────────────┘    └─────────────────┘
     │              │                  │                    │
     │              │                  │                    ├───► VALIDATED ───► (Sync to Odoo)
     │              │                  │                    │
     │              │                  │                    └───► REJECTED
     │              │                  │
     └──────────────┴──────────────────┴───────────────────────► CANCELLED
```

### 5.2 State Definitions

| State | Description | Allowed Actions |
|-------|-------------|-----------------|
| **Draft** | Order created but not started | Edit, Schedule, Start, Cancel |
| **Scheduled** | Waiting for scheduled date | Edit, Start early, Cancel |
| **In Progress** | Active counting in progress | Upload scans, View progress, Complete, Cancel |
| **Pending Review** | Counting complete, awaiting validation | Review discrepancies, Approve/Reject lines, Validate, Reject order |
| **Validated** | Adjustments applied to Odoo | View, Export, Request reversal |
| **Rejected** | Order rejected, no adjustments made | View, Reopen as draft |
| **Cancelled** | Order cancelled before completion | View |

### 5.3 Soft Lock Behavior

When a count order is **In Progress**:
1. Stock movements to/from selected locations are **allowed**
2. System **flags** any movements that occur
3. Affected locations are marked for **re-count**
4. Counter receives notification to re-scan flagged locations

---

## 6. RFID Integration

### 6.1 Device Authentication

RFID handheld devices authenticate using the same mechanism as the web application:

1. Device makes login request to Odoo
2. Receives `session_id` cookie
3. Includes session in all subsequent API calls via `X-Odoo-Session` header

### 6.2 API Endpoints

#### 6.2.1 Upload Scan Batch

```
POST /api/physical-inventory/scans/upload
```

**Headers:**
```
X-Odoo-Session: {session_id}
X-Tenant-ID: {tenant_id}
X-Device-ID: {device_identifier}
Content-Type: application/json
```

**Request Body:**
```json
{
  "scan_order_id": 123,
  "scans": [
    {
      "rfid_tag_id": "E2003412AC80C0D0",
      "location_barcode": "WH/Stock/AG/01/AA",
      "scanned_at": "2026-01-23T14:30:00Z",
      "signal_strength": -45
    },
    {
      "rfid_tag_id": "E2003412AC80C0D1",
      "location_barcode": "WH/Stock/AG/01/AB",
      "scanned_at": "2026-01-23T14:30:05Z",
      "signal_strength": -52
    }
  ],
  "is_final_batch": false
}
```

**Response:**
```json
{
  "success": true,
  "upload_id": 456,
  "summary": {
    "total_scans": 2,
    "matched": 2,
    "unknown": 0,
    "misplaced": 0
  },
  "unknown_tags": []
}
```

#### 6.2.2 Chunked Upload (for large batches)

For batches exceeding 10,000 scans, use chunked upload:

```
POST /api/physical-inventory/scans/upload/init
```
Returns `upload_session_id`

```
POST /api/physical-inventory/scans/upload/{upload_session_id}/chunk
```
Upload chunks of 5,000 scans each

```
POST /api/physical-inventory/scans/upload/{upload_session_id}/complete
```
Finalize and process all chunks

#### 6.2.3 Get Available Count Orders

```
GET /api/physical-inventory/orders/available
```

Returns orders assigned to the authenticated user that are in `draft`, `scheduled`, or `in_progress` status.

#### 6.2.4 Get Location Barcodes

```
GET /api/physical-inventory/locations?order_id={scan_order_id}
```

Returns list of locations in scope for the count order with their barcodes.

### 6.3 RFID Tag Mapping

The RFID tag ID directly maps to the `lot_id` (serial number) in Odoo's `stock.lot` model:

```
RFID Tag: E2003412AC80C0D0
    ↓
stock.lot.name = "E2003412AC80C0D0"
    ↓
stock.quant (product_id, location_id, lot_id, quantity)
```

### 6.4 Barcode Fallback

If RFID tag is unreadable, device can fall back to scanning product barcode:

```json
{
  "scan_type": "barcode",
  "barcode": "5901234123457",
  "location_barcode": "WH/Stock/AG/01/AA",
  "scanned_at": "2026-01-23T14:30:00Z",
  "quantity": 1
}
```

---

## 7. Discrepancy Management

### 7.1 Discrepancy Types

| Type | Description | Detection |
|------|-------------|-----------|
| **Shortage** | Less items than expected | counted_qty < expected_qty |
| **Surplus** | More items than expected | counted_qty > expected_qty |
| **Missing** | Expected item not found at all | Item in expected list but not scanned |
| **Misplaced** | Item found in wrong location | RFID found in different location than expected |
| **Unknown** | Scanned RFID not in system | No matching lot_id in stock.lot |

### 7.2 Discrepancy Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                    DISCREPANCY REVIEW                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Count Order moves to PENDING_REVIEW                      │
│                        ↓                                     │
│  2. System generates discrepancy list                        │
│     • Shows expected vs actual                               │
│     • Shows location comparison                              │
│     • Shows movement history (configurable depth)            │
│                        ↓                                     │
│  3. Manager reviews each discrepancy                         │
│     ├── APPROVE: Accept the counted quantity                 │
│     │   • Select reason code (required)                      │
│     │   • Add notes (optional)                               │
│     │                                                        │
│     └── REJECT: Keep system quantity                         │
│         • Provide rejection reason                           │
│         • May trigger re-count                               │
│                        ↓                                     │
│  4. Manager validates order                                  │
│     • Approved discrepancies → stock adjustments             │
│     • Rejected discrepancies → no change                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 7.3 Missing Items Confirmation

Items expected but not scanned require explicit confirmation:

1. System shows list of unscanned items
2. User must confirm each:
   - "Not Found" - creates shortage adjustment
   - "Will Scan Later" - keeps order in progress
   - "Exclude from Count" - removes from this order

### 7.4 Reason Codes

**System-provided codes:**
- Damaged/Destroyed
- Lost/Stolen
- Misplaced/Wrong Location
- Count Error
- System Data Entry Error
- Expired/Disposed
- Customer Return Not Entered
- Sample/Demo Use
- Received But Not Entered
- Quality Hold/Quarantine

**Custom codes:** Warehouse managers can add custom reason codes.

---

## 8. User Interface Specifications

### 8.1 Navigation Structure

```
/physical-inventory
├── /                      → Dashboard
├── /orders                → Count Order List
├── /orders/create         → Create New Order
├── /orders/:id            → Order Detail View
├── /orders/:id/count      → Count Entry (for manual/barcode)
├── /orders/:id/review     → Discrepancy Review
├── /orders/:id/history    → Order Audit Trail
├── /reports               → Reports & Analytics
├── /reports/accuracy      → Accuracy Trends
├── /reports/adjustments   → Adjustment History
└── /settings              → Configuration (reason codes, defaults)
```

### 8.2 Dashboard

**Key Metrics Cards:**
- Active count orders
- Pending validation
- Scheduled counts (upcoming)
- Total adjustments (this month)

**Charts:**
- Inventory accuracy trend (line chart)
- Discrepancies by reason code (pie chart)
- Count completion rate (progress bar)
- Adjustments by location (bar chart)

**Quick Actions:**
- Create new count order
- View pending validations
- View scheduled counts

### 8.3 Count Order List

**Filters:**
- Status (multi-select)
- Date range (scheduled/completed)
- Location (hierarchical)
- Responsible user
- Created by

**Columns:**
- Reference
- Name
- Status (badge)
- Scope summary
- Scheduled date
- Progress (if in_progress)
- Responsible
- Actions

**View Options:**
- Table view
- Card view

### 8.4 Create Count Order Form

**Section 1: Basic Information**
- Name (text)
- Scheduled date (datetime picker, optional)
- Recurring schedule (dropdown: none, daily, weekly, monthly)
- Timeout (days, optional)

**Section 2: Scope Selection**
- Scope type (radio: Full Warehouse, By Location, By Category, Mixed)
- Location selector (hierarchical tree with checkboxes)
  - Warehouse → Zone/Row → Rack → Level → Bin
- Category selector (multi-select)

**Section 3: Configuration**
- Blind count (toggle)
- Assigned counters (multi-select users)

**Section 4: Summary**
- Estimated items count
- Estimated locations count

### 8.5 Discrepancy Review Page

**Header:**
- Order info
- Overall stats (total lines, discrepancies, approved, rejected)

**Main Content:**
- Filter bar (by type: shortage, surplus, missing, misplaced)
- Bulk actions (approve all, reject all)

**Discrepancy Table:**
| Product | Location | Expected | Counted | Difference | History | Status | Actions |
|---------|----------|----------|---------|------------|---------|--------|---------|
| Item A  | Bin 01   | 100      | 95      | -5         | [View]  | Pending | [Approve] [Reject] |

**Approval Modal:**
- Reason code (dropdown, required)
- Notes (textarea, optional)
- Confirm button

**Movement History Panel:**
- Configurable depth (last N movements or since last count)
- Shows: date, movement type, quantity, from/to location, reference

### 8.6 Localization

Full support for:
- **English (LTR)**
- **Arabic (RTL)**

All UI components must respect text direction and layout mirroring.

---

## 9. Odoo Integration

### 9.1 Two-Way Sync

**Our System → Odoo:**
- On validation, create `stock.move` records for adjustments
- Use `stock.quant` adjustment endpoints

**Odoo → Our System:**
- Fetch `stock.quant` for expected quantities
- Fetch `stock.lot` for RFID tag mapping
- Fetch `stock.location` for location hierarchy
- Fetch `product.product` for product info

### 9.2 Sync on Validation

```python
# Pseudo-code for validation sync
for line in approved_discrepancy_lines:
    if line.difference != 0:
        # Create inventory adjustment move
        odoo.create('stock.move', {
            'product_id': line.product_id,
            'location_id': adjustment_location,  # Virtual inventory adjustment location
            'location_dest_id': line.location_id,  # If surplus
            # OR
            'location_id': line.location_id,  # If shortage
            'location_dest_id': adjustment_location,
            'product_uom_qty': abs(line.difference),
            'origin': f'INV-ADJ/{scan_order.reference}',
        })
```

### 9.3 Reversal Handling

When a validated order is reversed:
1. Create counter-movements to undo adjustments
2. Log all reversal details
3. Mark original order as "reversed"

---

## 10. Reports & Analytics

### 10.1 Standard Reports

| Report | Description |
|--------|-------------|
| **Count Summary** | Overview of count order with all lines and discrepancies |
| **Discrepancy Report** | All discrepancies with reason codes and notes |
| **Adjustment Report** | All inventory adjustments made |
| **Accuracy Report** | Accuracy % by location, category, time period |
| **User Activity** | Counts performed, scans uploaded, by user |
| **Audit Trail** | Full history of all actions on an order |

### 10.2 Export Formats

- PDF (formatted report)
- Excel (data export)
- CSV (raw data)

### 10.3 Scheduled Reports

Managers can schedule automated reports:
- Daily accuracy summary (email)
- Weekly adjustment summary
- Monthly audit report

---

## 11. Notifications & Alerts

### 11.1 In-App Notifications

- Count order assigned to you
- Scan upload completed
- Order ready for validation
- Discrepancy requires attention
- Order validated/rejected
- Reversal requested/approved

### 11.2 Email Notifications

- Daily digest of pending validations
- Critical discrepancy alerts (configurable threshold)
- Scheduled count reminders
- Validation summary

### 11.3 SMS Alerts (Critical Only)

- Large discrepancy detected (> configurable value)
- Count order timeout warning
- Reversal approved

---

## 12. Performance Requirements

### 12.1 Scale Targets

| Metric | Target |
|--------|--------|
| Items per scan batch | 100,000+ |
| Concurrent count orders | 50+ |
| API response time (p95) | < 500ms |
| Scan upload processing | < 60 seconds for 10K items |
| Dashboard load time | < 2 seconds |

### 12.2 Chunked Upload

For large batches (>10,000 items):
- Split into chunks of 5,000
- Background processing with progress tracking
- Resumable uploads if connection lost

---

## 13. Implementation Phases

### Phase 1: Core System (Current Scope)

**Week 1-2: Database & API Foundation**
- [ ] Create MariaDB tables
- [ ] Basic CRUD API for scan orders
- [ ] RFID upload API endpoint (with chunking)

**Week 3-4: Web UI - Order Management**
- [ ] Dashboard with metrics
- [ ] Count order list with filters
- [ ] Create/edit order form
- [ ] Order detail view

**Week 5-6: Discrepancy Workflow**
- [ ] Discrepancy review page
- [ ] Approval/rejection flow
- [ ] Reason codes management
- [ ] Missing items confirmation

**Week 7-8: Odoo Integration & Polish**
- [ ] Two-way sync implementation
- [ ] Validation → stock.move creation
- [ ] Reversal workflow
- [ ] Audit logging
- [ ] Reports & exports

### Phase 2: Future Enhancements

- 3D Warehouse Navigator integration
- Financial impact calculations
- ABC analysis auto-scheduling
- Mobile web app for manual counting
- RFID device management portal

---

## 14. Out of Scope (Phase 2+)

| Feature | Reason |
|---------|--------|
| 3D Warehouse visualization | Complex integration, deferred |
| Financial impact/valuation | Requires accounting integration |
| Custom report builder | Standard reports sufficient for MVP |
| Voice input for counting | Hardware dependency |
| RFID device management | Separate system concern |

---

## 15. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | How to handle partial RFID tag reads (corrupted data)? | TBD |
| 2 | Should we support multiple warehouses in single count order? | TBD |
| 3 | Integration with existing approval workflow system? | TBD |
| 4 | Offline mode for RFID devices (local queue)? | TBD |

---

## 16. Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| **Count Order** | A formal request to count inventory in specified locations |
| **Scan Batch** | A collection of RFID scans uploaded from a device |
| **Discrepancy** | Difference between expected and counted quantity |
| **Blind Count** | Counting without seeing expected quantities |
| **Cycle Count** | Periodic partial inventory counts |
| **RFID Tag** | Radio-frequency identification tag on each item |
| **Lot/Serial** | Unique identifier for an individual item |

### B. RFID Payload Schema

```typescript
interface RFIDScan {
  rfid_tag_id: string;      // Required: The RFID tag identifier
  location_barcode: string;  // Required: Scanned location barcode
  scanned_at: string;        // Required: ISO 8601 timestamp
  device_id?: string;        // Optional: Device identifier
  signal_strength?: number;  // Optional: RSSI value (-100 to 0)
}

interface ScanUploadRequest {
  scan_order_id: number;     // Required: Target count order
  scans: RFIDScan[];         // Required: Array of scans
  is_final_batch: boolean;   // Required: Is this the last batch?
}

interface ScanUploadResponse {
  success: boolean;
  upload_id: number;
  summary: {
    total_scans: number;
    matched: number;
    unknown: number;
    misplaced: number;
  };
  unknown_tags: string[];    // List of unrecognized tag IDs
  errors?: string[];
}
```

### C. Reason Code Categories

```typescript
type ReasonCategory = 'shortage' | 'surplus' | 'misplaced' | 'other';

interface ReasonCode {
  id: number;
  code: string;
  name: string;
  description?: string;
  category: ReasonCategory;
  is_system: boolean;
  is_active: boolean;
}
```

---

## 17. Implementation Status

### Frontend Components (Completed)

| Component | File | Status |
|-----------|------|--------|
| **Dashboard** | `PhysicalInventoryDashboard.tsx` | ✅ Implemented |
| **Order List** | `OrderListPage.tsx` | ✅ Implemented |
| **Create Order** | `CreateOrderPage.tsx` | ✅ Implemented |
| **Order Detail** | `OrderDetailPage.tsx` | ✅ Implemented |
| **Discrepancy Review** | `DiscrepancyReviewPage.tsx` | ✅ Implemented |

### TypeScript Types (Completed)

All types defined in `types.ts`:
- `ScanOrder` - Count order entity
- `ScanOrderLine` - Order line with expected/counted quantities
- `ScanUpload` - RFID upload batch tracking
- `UnknownTag` - Unmatched RFID tags
- `ReasonCode` - Discrepancy reason codes
- `DashboardStats` - Dashboard metrics
- `AuditLogEntry` - Audit trail entries
- API request/response types for all operations

### API Service (Completed)

Service class in `physicalInventory.service.ts` with methods:
- `getDashboardStats()` - Fetch dashboard metrics
- `listOrders()` - List orders with filters and pagination
- `getOrder()` - Get single order details
- `createOrder()` - Create new count order
- `updateOrder()` - Update existing order
- `startOrder()` - Start counting process
- `completeOrder()` - Mark counting complete
- `validateOrder()` - Validate and apply adjustments
- `rejectOrder()` - Reject count order
- `cancelOrder()` - Cancel count order
- `getOrderLines()` - Get order lines with pagination
- `uploadScans()` - Upload RFID scan batch
- `initChunkedUpload()` - Initialize chunked upload session
- `uploadChunk()` - Upload scan chunk
- `completeChunkedUpload()` - Finalize chunked upload
- `getUploads()` - List uploads for an order
- `getUnknownTags()` - Get unmatched tags
- `resolveUnknownTag()` - Mark tag as resolved
- `approveDiscrepancy()` - Approve discrepancy with reason
- `rejectDiscrepancy()` - Reject discrepancy
- `bulkApproveDiscrepancies()` - Bulk approve
- `bulkRejectDiscrepancies()` - Bulk reject
- `getReasonCodes()` - List reason codes
- `getAuditLog()` - Get audit trail

### Routes (Completed)

Routes added to `App.tsx`:
- `/physical-inventory` - Dashboard
- `/physical-inventory/orders` - Order list
- `/physical-inventory/orders/create` - Create new order
- `/physical-inventory/orders/:id` - Order detail
- `/physical-inventory/orders/:id/review` - Discrepancy review

### Pending Backend Work

The following backend components need to be implemented:
- [ ] MariaDB tables (see Section 4.2)
- [ ] Backend API endpoints matching service methods
- [ ] Odoo sync integration for validation
- [ ] Reversal workflow backend

---

**Document Status:** Implementation Phase 1 Complete (Frontend)
**Next Steps:** Backend API implementation, Database setup, Odoo integration
