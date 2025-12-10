# Architecture Diagram - Security & Personalization System

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER BROWSER                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      React Application                              │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │                    App.tsx (Entry Point)                     │  │  │
│  │  │  ┌─────────────────────────────────────────────────────────┐ │  │  │
│  │  │  │  SecurityProvider (context/security.tsx)                │ │  │  │
│  │  │  │  ┌──────────────────────────────────────────────────┐   │ │  │  │
│  │  │  │  │ PersonalizationProvider (context/personalization)│   │ │  │  │
│  │  │  │  │  ┌──────────────────────────────────────────┐    │   │ │  │  │
│  │  │  │  │  │         SidebarProvider                   │    │   │ │  │  │
│  │  │  │  │  │  ┌──────────────────────────────────┐    │    │   │ │  │  │
│  │  │  │  │  │  │     React Router                  │    │    │   │ │  │  │
│  │  │  │  │  │  │  ┌────────────────────────────┐  │    │    │   │ │  │  │
│  │  │  │  │  │  │  │  /admin   → AdminPage      │  │    │    │   │ │  │  │
│  │  │  │  │  │  │  │  /attributes → Attributes  │  │    │    │   │ │  │  │
│  │  │  │  │  │  │  │  /batch   → Batch         │  │    │    │   │ │  │  │
│  │  │  │  │  │  │  │  ... (other pages)        │  │    │    │   │ │  │  │
│  │  │  │  │  │  │  └────────────────────────────┘  │    │    │   │ │  │  │
│  │  │  │  │  │  └──────────────────────────────────┘    │    │   │ │  │  │
│  │  │  │  │  └──────────────────────────────────────────┘    │   │ │  │  │
│  │  │  │  └──────────────────────────────────────────────────┘   │ │  │  │
│  │  │  └─────────────────────────────────────────────────────────┘ │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ││
                                    ││ HTTP Requests
                                    ││ (fetch API)
                                    ↓↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXPRESS BACKEND SERVER                            │
│                          (backend/index.js)                               │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                        Route Mounting                               │  │
│  │  /api/v1/security        → securityRoutes                          │  │
│  │  /api/v1/personalization → personalizationRoutes                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    ││                                     │
│         ┌──────────────────────────┴┴──────────────────────────┐         │
│         │                                                       │         │
│         ↓                                                       ↓         │
│  ┌──────────────────────────┐                    ┌──────────────────────┐│
│  │ Security Microservice    │                    │ Personalization      ││
│  │ (services/security/)     │                    │ Microservice         ││
│  │                          │                    │ (services/personal.) ││
│  │  ┌──────────────────┐   │                    │  ┌─────────────────┐ ││
│  │  │   Controllers     │   │                    │  │  Controllers    │ ││
│  │  │ ┌──────────────┐ │   │                    │  │ ┌─────────────┐ │ ││
│  │  │ │ pages        │ │   │                    │  │ │ styles      │ │ ││
│  │  │ │ sections     │ │   │                    │  │ └─────────────┘ │ ││
│  │  │ │ permissions  │ │   │                    │  └─────────────────┘ ││
│  │  │ │ userAccess   │ │   │                    │  ┌─────────────────┐ ││
│  │  │ │ roles        │ │   │                    │  │   Services      │ ││
│  │  │ │ audit        │ │   │                    │  │ ┌─────────────┐ │ ││
│  │  │ └──────────────┘ │   │                    │  │ │StyleService │ │ ││
│  │  └──────────────────┘   │                    │  │ └─────────────┘ │ ││
│  │  ┌──────────────────┐   │                    │  └─────────────────┘ ││
│  │  │    Services       │   │                    └──────────────────────┘│
│  │  │ ┌──────────────┐ │   │                                             │
│  │  │ │ Permission   │ │   │                                             │
│  │  │ │ PageSecurity │ │   │                                             │
│  │  │ │ Audit        │ │   │                                             │
│  │  │ └──────────────┘ │   │                                             │
│  │  └──────────────────┘   │                                             │
│  │  ┌──────────────────┐   │                                             │
│  │  │   Middleware      │   │                                             │
│  │  │ ┌──────────────┐ │   │                                             │
│  │  │ │ permission   │ │   │                                             │
│  │  │ │ audit        │ │   │                                             │
│  │  │ └──────────────┘ │   │                                             │
│  │  └──────────────────┘   │                                             │
│  └──────────────────────────┘                                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    ││
                                    ││ SQL Queries
                                    ││ (mysql2/promise)
                                    ↓↓
┌─────────────────────────────────────────────────────────────────────────┐
│                           MARIADB DATABASE                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                         Database Tables                             │  │
│  │  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │  │
│  │  │ pages           │  │ page_permissions │  │ section_styles  │  │  │
│  │  │ ┌─────────────┐ │  │ ┌──────────────┐ │  │ ┌─────────────┐ │  │  │
│  │  │ │ page_id     │ │  │ │ permission_id│ │  │ │ style_id    │ │  │  │
│  │  │ │ page_name   │ │  │ │ page_id      │ │  │ │ section_id  │ │  │  │
│  │  │ │ page_route  │ │  │ │ role_id      │ │  │ │ theme       │ │  │  │
│  │  │ │ description │ │  │ │ can_view     │ │  │ │ bg_color    │ │  │  │
│  │  │ │ is_active   │ │  │ └──────────────┘ │  │ │ text_color  │ │  │  │
│  │  │ └─────────────┘ │  └──────────────────┘  │ │ border_...  │ │  │  │
│  │  └─────────────────┘                        │ └─────────────┘ │  │  │
│  │  ┌─────────────────┐  ┌──────────────────┐  └─────────────────┘  │  │
│  │  │ page_sections   │  │section_permissions│                       │  │
│  │  │ ┌─────────────┐ │  │ ┌──────────────┐ │  ┌─────────────────┐  │  │
│  │  │ │ section_id  │ │  │ │ permission_id│ │  │ audit_log       │  │  │
│  │  │ │ page_id     │ │  │ │ section_id   │ │  │ ┌─────────────┐ │  │  │
│  │  │ │ section_type│ │  │ │ role_id      │ │  │ │ log_id      │ │  │  │
│  │  │ │ section_name│ │  │ │ can_view     │ │  │ │ user_id     │ │  │  │
│  │  │ │ parent_id   │ │  │ │ can_edit     │ │  │ │ action_type │ │  │  │
│  │  │ │ display_ord │ │  │ │ can_execute  │ │  │ │ entity_type │ │  │  │
│  │  │ └─────────────┘ │  │ └──────────────┘ │  │ │ old_value   │ │  │  │
│  │  └─────────────────┘  └──────────────────┘  │ │ new_value   │ │  │  │
│  │                                              │ └─────────────┘ │  │  │
│  │  ┌─────────────────┐  ┌──────────────────┐  └─────────────────┘  │  │
│  │  │ res_users       │  │ res_groups       │                       │  │
│  │  │ ┌─────────────┐ │  │ ┌──────────────┐ │                       │  │
│  │  │ │ id          │ │  │ │ id           │ │                       │  │
│  │  │ │ partner_id  │ │  │ │ name         │ │                       │  │
│  │  │ │ role        │ │  │ │ category     │ │                       │  │
│  │  │ │ login       │ │  │ │ description  │ │                       │  │
│  │  │ └─────────────┘ │  │ └──────────────┘ │                       │  │
│  │  └─────────────────┘  └──────────────────┘                       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Admin Configures Page Permissions

```
┌──────────┐    1. Click     ┌──────────┐    2. POST      ┌─────────────┐
│          │   "Settings"     │          │   /api/v1/      │             │
│  Admin   │ ───────────────→ │AdminPage │  security/      │  Security   │
│  User    │                  │          │  permissions/   │Microservice │
│          │                  │          │  page           │             │
└──────────┘                  └──────────┘                 └─────────────┘
                                    │                             │
                                    │ 3. Select Roles            │
                                    │                             │
                                    │ 4. Save                    │
                                    ↓                             ↓
                              ┌──────────┐               ┌─────────────┐
                              │  Modal   │               │   MariaDB   │
                              │  Shows   │               │   INSERT/   │
                              │  Roles   │               │   UPDATE    │
                              └──────────┘               │page_perms   │
                                                         └─────────────┘
```

### 2. Admin Configures Section Styles & Permissions

```
┌──────────┐   1. Click      ┌──────────┐   2. GET        ┌─────────────┐
│          │  "Edit Fields"   │          │   /api/v1/      │  Security   │
│  Admin   │ ───────────────→ │AdminPage │   security/     │Microservice │
│  User    │                  │          │   sections/     │             │
│          │                  │          │   page/:id      └─────────────┘
└──────────┘                  └──────────┘                        │
                                    │                             ↓
                                    │ 3. Shows Section     ┌─────────────┐
                                    │    Tree              │  MariaDB    │
                                    ↓                      │  SELECT     │
                              ┌──────────┐                │  page_      │
                              │ Section  │                │  sections   │
                              │  Tree    │                └─────────────┘
                              │  Modal   │
                              └──────────┘
                                    │
                                    │ 4. Click Section
                                    ↓
                              ┌──────────┐   5. GET Styles  ┌──────────────┐
                              │ Section  │ ───────────────→ │Personalization│
                              │ Editor   │                  │ Microservice │
                              │  Modal   │                  └──────────────┘
                              │          │                         │
                              │          │ 6. GET Perms            ↓
                              │          │ ──────────────→ ┌─────────────┐
                              └──────────┘                 │  Security   │
                                    │                      │Microservice │
                                    │                      └─────────────┘
                                    │ 7. Edit Colors              │
                                    │    & Permissions            ↓
                                    │                      ┌─────────────┐
                                    │ 8. Save              │  MariaDB    │
                                    ↓                      │  SELECT     │
                              ┌──────────┐                │section_styles│
                              │   POST   │                │section_perms │
                              │ styles & │                └─────────────┘
                              │  perms   │                       │
                              └──────────┘                       │
                                    │                             │
                                    ↓                             ↓
                         ┌──────────────────┐          ┌─────────────┐
                         │Personalization   │          │  Security   │
                         │  Microservice    │          │Microservice │
                         │  POST styles     │          │ POST perms  │
                         └──────────────────┘          └─────────────┘
                                    │                             │
                                    ↓                             ↓
                              ┌─────────────────────────────────┐
                              │          MariaDB                 │
                              │  INSERT/UPDATE section_styles   │
                              │  INSERT/UPDATE section_perms    │
                              │  INSERT audit_log               │
                              └─────────────────────────────────┘
```

### 3. User Views a Page

```
┌──────────┐   1. Navigate   ┌──────────┐   2. GET User    ┌─────────────┐
│          │   to /attributes │          │   Role           │  Security   │
│  Normal  │ ───────────────→ │Attributes│ ───────────────→ │  Context    │
│  User    │                  │  Page    │                  │             │
│          │                  │          │                  └─────────────┘
└──────────┘                  └──────────┘                         │
                                    │                              ↓
                                    │                      ┌─────────────┐
                                    │                      │  GET        │
                                    │                      │/api/v1/     │
                                    │                      │security/    │
                                    │                      │user/:id/    │
                                    │                      │role         │
                                    │                      └─────────────┘
                                    │                              │
                                    │                              ↓
                                    │                      ┌─────────────┐
                                    │                      │  MariaDB    │
                                    │                      │  SELECT role│
                                    │                      │  FROM       │
                                    │                      │  res_users  │
                                    │                      └─────────────┘
                                    │
                                    │ 3. Components Use
                                    │    usePermissions()
                                    ↓
                              ┌──────────┐   4. Check Access  ┌─────────────┐
                              │Secured   │ ─────────────────→ │  Security   │
                              │Section   │                    │  Context    │
                              │          │ ←───────────────── │             │
                              │          │   5. Returns       └─────────────┘
                              │          │      canView              │
                              └──────────┘                           │
                                    │                                │
                                    │ 6. If canView = true          ↓
                                    │    Render section      ┌─────────────┐
                                    ↓                        │  Cached     │
                              ┌──────────┐                  │  Permissions│
                              │ Styled   │   7. Load Styles │             │
                              │ Section  │ ───────────────→ └─────────────┘
                              │          │                         │
                              │          │ ←───────────────        │
                              │          │   8. Apply Styles       ↓
                              └──────────┘                  ┌─────────────┐
                                    │                       │Personalize  │
                                    ↓                       │  Context    │
                              ┌──────────┐                 └─────────────┘
                              │ Rendered │                        │
                              │ with     │                        ↓
                              │ Custom   │                 ┌─────────────┐
                              │ Styles   │                 │  GET        │
                              └──────────┘                 │/api/v1/     │
                                                          │personalize/ │
                                                          │styles/:id   │
                                                          └─────────────┘
                                                                 │
                                                                 ↓
                                                          ┌─────────────┐
                                                          │  MariaDB    │
                                                          │  SELECT     │
                                                          │section_styles│
                                                          └─────────────┘
```

## Component Interaction

### Frontend Hooks & Wrappers

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Page Component                               │
│                         (e.g. attributes.tsx)                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                        SecuredSection                          │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │ 1. Calls usePermissions('attributes-header')            │  │   │
│  │  │    ↓                                                     │  │   │
│  │  │ 2. usePermissions calls useSecurity()                   │  │   │
│  │  │    ↓                                                     │  │   │
│  │  │ 3. SecurityContext.checkSectionAccess()                 │  │   │
│  │  │    ↓                                                     │  │   │
│  │  │ 4. Returns: { canView, canEdit, canExecute }            │  │   │
│  │  │    ↓                                                     │  │   │
│  │  │ 5. If canView = false → return null                     │  │   │
│  │  │    If canView = true  → render children                 │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  │                              │                                │   │
│  │                              ↓                                │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │                     StyledSection                        │  │   │
│  │  │  ┌────────────────────────────────────────────────────┐ │  │   │
│  │  │  │ 1. Calls useSectionStyles('attributes-header')     │ │  │   │
│  │  │  │    ↓                                                │ │  │   │
│  │  │  │ 2. useSectionStyles calls usePersonalization()     │ │  │   │
│  │  │  │    ↓                                                │ │  │   │
│  │  │  │ 3. PersonalizationContext.loadSectionStyles()      │ │  │   │
│  │  │  │    ↓                                                │ │  │   │
│  │  │  │ 4. Returns: { background, color, border, ... }     │ │  │   │
│  │  │  │    ↓                                                │ │  │   │
│  │  │  │ 5. Applies styles to wrapper div                   │ │  │   │
│  │  │  └────────────────────────────────────────────────────┘ │  │   │
│  │  │                              │                            │  │   │
│  │  │                              ↓                            │  │   │
│  │  │                      ┌──────────────┐                    │  │   │
│  │  │                      │   Rendered   │                    │  │   │
│  │  │                      │   Content    │                    │  │   │
│  │  │                      └──────────────┘                    │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Caching Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Frontend Caching                                │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    SecurityContext                             │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │  pagePermissions: Map<pageId, boolean>                 │  │   │
│  │  │  sectionPermissions: Map<sectionId, {                  │  │   │
│  │  │    permissions: { view: bool, edit: bool, ... },       │  │   │
│  │  │    timestamp: number                                    │  │   │
│  │  │  }>                                                     │  │   │
│  │  │  ↓                                                       │  │   │
│  │  │  Cache TTL: 5 minutes                                   │  │   │
│  │  │  ↓                                                       │  │   │
│  │  │  On miss: Fetch from backend                            │  │   │
│  │  │  On hit: Return cached value                            │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              PersonalizationContext                            │   │
│  │  ┌────────────────────────────────────────────────────────┐  │   │
│  │  │  sectionStyles: Map<sectionId_theme, {                 │  │   │
│  │  │    styles: { background, text, border, ... },          │  │   │
│  │  │    timestamp: number                                    │  │   │
│  │  │  }>                                                     │  │   │
│  │  │  ↓                                                       │  │   │
│  │  │  Cache TTL: 10 minutes                                  │  │   │
│  │  │  ↓                                                       │  │   │
│  │  │  On miss: Fetch from backend                            │  │   │
│  │  │  On hit: Return cached value                            │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Security Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Permission Hierarchy                            │
│                                                                        │
│  1. User Role (res_users.role)                                       │
│     ↓                                                                  │
│  2. Page Permission (page_permissions)                                │
│     ↓ (if user doesn't have page access, stop here)                  │
│  3. Section Permission (section_permissions)                          │
│     ↓ (check parent sections if inherit_permissions = true)          │
│  4. Final Decision: Allow or Deny                                     │
│                                                                        │
│  Permission Types:                                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  can_view    → Show/hide UI element                           │   │
│  │  can_edit    → Enable/disable editing                         │   │
│  │  can_execute → Allow/deny button clicks                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  Inheritance:                                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Parent Section (inherit_permissions = false)                 │   │
│  │     ↓                                                          │   │
│  │  Child Section (inherit_permissions = true)                   │   │
│  │     → Uses parent's permissions                               │   │
│  │                                                                │   │
│  │  Child Section (override_parent = true)                       │   │
│  │     → Uses its own permissions (ignores parent)               │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

## Audit Trail

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Audit Logging                                 │
│                                                                        │
│  Every admin action is logged to audit_log table:                     │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Action: permission_changed                                     │  │
│  │  User: admin_user_id                                            │  │
│  │  Entity: page_id or section_id                                  │  │
│  │  Old Value: JSON of old permissions                             │  │
│  │  New Value: JSON of new permissions                             │  │
│  │  IP Address: req.ip                                             │  │
│  │  Timestamp: CURRENT_TIMESTAMP                                   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Action: style_updated                                          │  │
│  │  User: admin_user_id                                            │  │
│  │  Entity: section_id                                             │  │
│  │  Old Value: JSON of old styles                                  │  │
│  │  New Value: JSON of new styles                                  │  │
│  │  IP Address: req.ip                                             │  │
│  │  Timestamp: CURRENT_TIMESTAMP                                   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Audit trail can be queried via:                                      │
│  GET /api/v1/security/audit/trail?user_id=X&action_type=Y            │
└──────────────────────────────────────────────────────────────────────┘
```

---

**This architecture ensures:**
- ✅ Separation of concerns (microservices)
- ✅ Efficient caching for performance
- ✅ Role-based access control
- ✅ Hierarchical permissions
- ✅ Theme-aware styling
- ✅ Complete audit trail
- ✅ Scalable and maintainable codebase

