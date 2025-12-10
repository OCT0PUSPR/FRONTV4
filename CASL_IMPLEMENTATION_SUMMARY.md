# CASL RBAC Implementation Summary

## Overview
CASL (Isomorphic Authorization Library) has been fully integrated into the application to provide role-based access control (RBAC) for pages and sections/fields. The system uses strict security by default - users can only access pages/sections if explicitly granted permission.

## What Was Implemented

### 1. CASL Context Provider (`context/casl.tsx`)
- Loads user role from `res_users.role` column
- Fetches page permissions from `page_permissions` table
- Builds CASL ability rules based on user's role
- Provides helper functions: `canViewPage`, `canViewSection`, `canEditSection`, `canExecuteSection`

### 2. ProtectedRoute Component (`src/components/ProtectedRoute.tsx`)
- Wraps routes to check page-level permissions
- Shows "Access Denied" message if user doesn't have permission
- Automatically redirects unauthorized users

### 3. Route-to-PageID Mapping (`src/config/pageRoutes.ts`)
- Maps frontend routes to database `page_id` values
- Used by both ProtectedRoute and EnhancedSidebar

### 4. Enhanced Sidebar Filtering
- Automatically hides menu items for pages user can't access
- Recursively filters nested menu items
- Only shows pages user has `view` permission for

### 5. CASL Components for Sections/Fields
- **CaslSection** (`src/components/CaslSection.tsx`): Basic CASL permission wrapper
- **CaslButton**: Button with execute permission check
- **CaslInput**: Input with edit permission check
- **CaslStyledSection** (`src/components/CaslStyledSection.tsx`): Combined CASL + Styling
- **CaslStyledButton**: Button with CASL + styling
- **CaslStyledInput**: Input with CASL + styling

## Database Migration Required

**IMPORTANT**: Before using this system, you must run the database migration to change `role_id` from `INT` to `VARCHAR`:

```bash
mysql -u your_username -p your_database_name < backend/services/security/migrations/001_alter_role_id_to_varchar_simple.sql
```

This allows storing string role values (like "Admin", "Manager") instead of integers.

## How It Works

### Page-Level Protection

1. **User logs in** → CASL context loads user role from `res_users.role`
2. **CASL loads permissions** → Fetches all pages and checks permissions for user's role
3. **Routes are protected** → `ProtectedRoute` checks if user can view the page
4. **Sidebar filters** → Only shows pages user has access to

### Section/Field-Level Protection

1. **Page renders** → Sections use `CaslSection` or `CaslStyledSection`
2. **Permission check** → CASL checks if user's role has permission for that section
3. **Conditional render** → Section only renders if user has permission

## Usage Examples

### Protecting a Route

```tsx
import { ProtectedRoute } from './components/ProtectedRoute';

<Route 
  path="/attributes" 
  element={
    <ProtectedRoute pageId="attributes">
      <AttributesPage />
    </ProtectedRoute>
  } 
/>
```

### Using CASL in Components

```tsx
import { CaslStyledSection, CaslStyledButton, CaslStyledInput } from './components/CaslStyledSection';

// Section with view permission
<CaslStyledSection 
  sectionId="attributes-header"
  action="view"
  defaultStyles={{ padding: '1rem' }}
>
  <h1>Attributes</h1>
</CaslStyledSection>

// Button with execute permission
<CaslStyledButton
  sectionId="attributes-header-add-button"
  action="execute"
  onClick={handleAdd}
>
  Add Attribute
</CaslStyledButton>

// Input with edit permission
<CaslStyledInput
  sectionId="attributes-search-input"
  action="edit"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>
```

## Pages Currently Protected

The following pages are wrapped with `ProtectedRoute`:
- `/attributes` → `pageId: "attributes"`
- `/batch` → `pageId: "batch"`
- `/categories` → `pageId: "categories"`
- `/dashboard` → `pageId: "dashboard"`
- `/deliveries` → `pageId: "deliveries"`
- `/delivery-methods` → `pageId: "delivery-methods"`
- `/dropships` → `pageId: "dropship"`
- `/internal` → `pageId: "internal"`
- `/landing-costs` → `pageId: "landing-costs"`
- `/locations` → `pageId: "locations"`

## Security Model

### Strict by Default
- **No permissions set** → Access DENIED
- **Error loading permissions** → Access DENIED
- **No user role** → Access DENIED

### Permission Structure
- **Page permissions**: Stored in `page_permissions` table
  - `page_id`: The page identifier
  - `role_id`: The user's role (from `res_users.role`)
  - `can_view`: Boolean (1 = allowed, 0 = denied)

- **Section permissions**: Stored in `section_permissions` table
  - `section_id`: The section identifier
  - `role_id`: The user's role
  - `can_view`: Boolean
  - `can_edit`: Boolean
  - `can_execute`: Boolean (for buttons/actions)

## Admin Page Integration

The admin page (`/admin`) allows admins to:
1. Set which roles can view each page
2. Set which roles can view/edit/execute each section
3. Changes are saved to the database
4. CASL automatically reloads permissions when changed

## Next Steps

1. **Run the database migration** (see above)
2. **Set up page permissions** via the admin page
3. **Update pages** to use `CaslStyledSection` components instead of `SecuredSection`
4. **Test with different user roles** to verify access control

## Troubleshooting

### Pages not showing in sidebar
- Check if page has permissions set in `page_permissions` table
- Verify user's role matches `role_id` in permissions
- Check browser console for CASL ability rules

### "Access Denied" on all pages
- Verify user has a role in `res_users.role` column
- Check if permissions are loaded (see console logs)
- Ensure database migration was run

### Sections not rendering
- Verify section has permissions in `section_permissions` table
- Check if section ID matches exactly (case-sensitive)
- Use browser dev tools to check CASL ability rules

## Files Modified/Created

### Created:
- `context/casl.tsx` - CASL ability context
- `src/components/ProtectedRoute.tsx` - Route protection
- `src/components/CaslSection.tsx` - Basic CASL components
- `src/components/CaslStyledSection.tsx` - CASL + Styling components
- `src/config/pageRoutes.ts` - Route to page_id mapping
- `backend/services/security/migrations/001_alter_role_id_to_varchar_simple.sql` - Database migration

### Modified:
- `src/App.tsx` - Added CaslProvider, ProtectedRoute wrappers
- `@/components/EnhancedSidebar.tsx` - Added menu filtering based on CASL

## Testing Checklist

- [ ] Run database migration
- [ ] Set page permissions via admin page
- [ ] Test with different user roles
- [ ] Verify sidebar hides inaccessible pages
- [ ] Verify "Access Denied" shows for direct URL access
- [ ] Test section-level permissions
- [ ] Verify sections render/hide based on permissions

