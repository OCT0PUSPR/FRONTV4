# Security & Personalization Frontend Integration Guide

## Overview

This document explains how the security and personalization features are integrated into the frontend to control access and styling of pages, sections, and fields.

## Architecture

### 1. Context Providers

Two main context providers manage security and personalization:

- **SecurityProvider** (`src/context/security.tsx`): Manages permission checking and caching
- **PersonalizationProvider** (`src/context/personalization.tsx`): Manages style loading and application

Both providers are added to `App.tsx` and wrap the entire application.

### 2. API Services

- **SecurityApiService** (`src/services/securityApi.ts`): Communicates with `/api/v1/security` endpoints
- **PersonalizationApiService** (`src/services/securityApi.ts`): Communicates with `/api/v1/personalization` endpoints

### 3. Hooks

- **usePermissions** (`src/hooks/usePermissions.ts`): Hook for checking permissions
- **useSectionStyles** (`src/hooks/useSectionStyles.ts`): Hook for applying styles

### 4. Components

- **SecuredSection** (`src/components/SecuredSection.tsx`): Wrapper that hides content if no permission
- **SecuredButton**: Button disabled if no execute permission
- **SecuredInput**: Input disabled/readonly if no edit permission
- **StyledSection** (`src/components/StyledSection.tsx`): Applies custom styles to sections
- **StyledButton**: Button with custom styles
- **StyledInput**: Input with custom styles

## How It Works

### Permission Flow

1. When a component with `sectionId` renders, `usePermissions` hook checks cache
2. If not cached, it calls `SecurityApiService.checkSectionAccess()`
3. Backend checks user's role permissions for that section
4. Result is cached for 5 minutes
5. Component renders or hides based on permission

### Style Flow

1. When a component with `sectionId` renders, `useSectionStyles` hook checks cache
2. If not cached, it calls `PersonalizationApiService.getSectionStyles()`
3. Backend returns styles for current theme (light/dark)
4. Styles are merged with default styles
5. Component renders with merged styles

## Usage Examples

### Basic Permission Check

```tsx
import { SecuredSection } from "./components/SecuredSection"

// Hide entire section if no view permission
<SecuredSection sectionId="attributes-header-add-button" pageId="attributes">
  <Button onClick={handleAdd}>Add Attribute</Button>
</SecuredSection>
```

### Basic Style Application

```tsx
import { StyledSection } from "./components/StyledSection"

// Apply custom styles to section
<StyledSection 
  sectionId="attributes-header"
  defaultStyles={{ padding: '1rem', background: colors.card }}
>
  <h1>Attributes</h1>
</StyledSection>
```

### Combined Security + Styling

```tsx
import { SecuredSection } from "./components/SecuredSection"
import { StyledButton } from "./components/StyledSection"

// Button with both permission check and custom styling
<SecuredSection sectionId="attributes-header-add-button" pageId="attributes">
  <StyledButton
    sectionId="attributes-header-add-button"
    defaultStyles={{ background: colors.action }}
    onClick={handleAdd}
  >
    Add Attribute
  </StyledButton>
</SecuredSection>
```

### Secured Input Field

```tsx
import { SecuredInput } from "./components/SecuredSection"

// Input disabled if no edit permission
<SecuredInput
  sectionId="attributes-modal-name-field"
  pageId="attributes"
  value={formData.name}
  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
  placeholder="Enter attribute name"
/>
```

## Section IDs Reference

All section IDs are defined in `addToPageSections.sql`. The naming convention is:

- `{pageId}-{section-name}` for sections
- `{pageId}-{section-name}-{field-name}` for fields
- `{pageId}-{section-name}-{button-name}` for buttons

Examples:
- `attributes-header` - Header section
- `attributes-header-title` - Title field
- `attributes-header-add-button` - Add button
- `attributes-modal-name-field` - Name input field
- `attributes-modal-save-button` - Save button

## Integration Checklist

To integrate security and personalization into a page:

1. ✅ Import the components:
   ```tsx
   import { SecuredSection, SecuredButton, SecuredInput } from "./components/SecuredSection"
   import { StyledSection, StyledButton, StyledInput } from "./components/StyledSection"
   ```

2. ✅ Wrap sections with `SecuredSection` using the section ID from `addToPageSections.sql`

3. ✅ Wrap styled elements with `StyledSection` or use `StyledButton`/`StyledInput`

4. ✅ Replace regular inputs/buttons with `SecuredInput`/`SecuredButton` for permission control

5. ✅ Use `pageId` prop to help with permission inheritance

## Example: Attributes Page Integration

See `src/attributes.tsx` for a complete example showing:
- Header section with styled title and secured add button
- Search section with secured input
- Modal form fields with secured inputs
- Modal footer with secured buttons

## Performance Considerations

- **Caching**: Permissions are cached for 5 minutes, styles for 10 minutes
- **Lazy Loading**: Permissions/styles are fetched on-demand when components render
- **Batch Loading**: Page configurations can be loaded once for all sections on a page

## Troubleshooting

### Component not hiding when it should
- Check that `sectionId` matches exactly with database
- Verify user's role has permission set correctly
- Check browser console for API errors

### Styles not applying
- Verify `sectionId` exists in database
- Check that styles are set for current theme (light/dark)
- Verify API endpoint is accessible

### Performance issues
- Clear cache using `refreshPermissions()` or `refreshStyles()`
- Check network tab for duplicate API calls
- Consider pre-loading page configuration on page mount

