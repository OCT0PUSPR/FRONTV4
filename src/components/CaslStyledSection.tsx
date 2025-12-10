// =============================================
// CaslStyledSection.tsx
// Combined CASL + Styling component
// =============================================

"use client"

import React, { ReactNode, CSSProperties } from 'react';
import { Can } from '@casl/react';
import { useCasl } from '../../context/casl';
import { useSectionStyles } from '../hooks/useSectionStyles';

interface CaslStyledSectionProps {
  sectionId: string;
  action?: 'view' | 'edit' | 'execute';
  defaultStyles?: CSSProperties;
  className?: string;
  fallback?: ReactNode;
  hideIfNoAccess?: boolean;
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
  [key: string]: any;
}

/**
 * CaslStyledSection Component
 * 
 * Combines CASL permissions with styling from personalization system.
 * Only renders if user has permission, and applies custom styles.
 * 
 * @example
 * <CaslStyledSection 
 *   sectionId="attributes-header"
 *   action="view"
 *   defaultStyles={{ padding: '1rem' }}
 * >
 *   <h1>Attributes</h1>
 * </CaslStyledSection>
 */
export const CaslStyledSection: React.FC<CaslStyledSectionProps> = ({
  sectionId,
  action = 'view',
  defaultStyles = {},
  className,
  fallback = null,
  hideIfNoAccess = true,
  children,
  as: Component = 'div',
  ...props
}) => {
  const { ability } = useCasl();
  const { styles, isLoading } = useSectionStyles({
    sectionId,
    defaultStyles,
    autoLoad: true,
  });

  // Check if we're in admin mode (for admin page editor)
  const isAdminMode = typeof window !== 'undefined' && (window as any).__ADMIN_MODE__ === true;

  // Merge className if provided
  const mergedClassName = className ? className : undefined;
  const mergedStyles = { ...defaultStyles, ...styles };

  // In admin mode, bypass all checks and always render
  if (isAdminMode) {
    return (
      <Component 
        data-section-id={sectionId}
        className={mergedClassName}
        style={mergedStyles}
        {...props}
      >
        {children}
      </Component>
    );
  }

  return (
    <Can I={action} this={sectionId} ability={ability}>
      {(allowed: boolean) => {
        if (isLoading) {
          return null; // Show nothing while loading
        }

        if (!allowed && hideIfNoAccess) {
          return null;
        }
        if (!allowed && fallback) {
          return <>{fallback}</>;
        }
        if (!allowed) {
          return null;
        }

        // Render with data-section-id for admin page editor
        return (
          <Component 
            data-section-id={sectionId}
            className={mergedClassName}
            style={mergedStyles}
            {...props}
          >
            {children}
          </Component>
        );
      }}
    </Can>
  );
};

interface CaslStyledButtonProps {
  sectionId: string;
  action?: 'view' | 'edit' | 'execute';
  defaultStyles?: CSSProperties;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  [key: string]: any;
}

/**
 * CaslStyledButton Component
 * 
 * Button with CASL permissions and custom styles.
 * 
 * @example
 * <CaslStyledButton 
 *   sectionId="attributes-header-add-button"
 *   action="execute"
 *   onClick={handleAdd}
 * >
 *   Add Attribute
 * </CaslStyledButton>
 */
export const CaslStyledButton: React.FC<CaslStyledButtonProps> = ({
  sectionId,
  action = 'execute',
  defaultStyles = {},
  className,
  onClick,
  disabled,
  children,
  ...props
}) => {
  const { ability } = useCasl();
  const { styles } = useSectionStyles({
    sectionId,
    defaultStyles,
    autoLoad: true,
  });

  // Check if we're in admin mode (for admin page editor)
  const isAdminMode = typeof window !== 'undefined' && (window as any).__ADMIN_MODE__ === true;

  const mergedStyles = { ...defaultStyles, ...styles };

  // In admin mode, bypass all checks and always render
  if (isAdminMode) {
    return (
      <button
        data-section-id={sectionId}
        className={className}
        style={mergedStyles}
        onClick={onClick}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <Can I={action} this={sectionId} ability={ability}>
      {(allowed: boolean) => {
        if (!allowed) {
          return null;
        }

        return (
          <button
            data-section-id={sectionId}
            className={className}
            style={mergedStyles}
            onClick={onClick}
            disabled={disabled}
            {...props}
          >
            {children}
          </button>
        );
      }}
    </Can>
  );
};

interface CaslStyledInputProps {
  sectionId: string;
  action?: 'view' | 'edit';
  defaultStyles?: CSSProperties;
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  readOnly?: boolean;
  [key: string]: any;
}

/**
 * CaslStyledInput Component
 * 
 * Input field with CASL permissions and custom styles.
 * 
 * @example
 * <CaslStyledInput 
 *   sectionId="attributes-search-input"
 *   action="edit"
 *   value={searchQuery}
 *   onChange={(e) => setSearchQuery(e.target.value)}
 * />
 */
export const CaslStyledInput: React.FC<CaslStyledInputProps> = ({
  sectionId,
  action = 'edit',
  defaultStyles = {},
  className,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
  readOnly,
  ...props
}) => {
  const { ability } = useCasl();
  const { styles } = useSectionStyles({
    sectionId,
    defaultStyles,
    autoLoad: true,
  });

  const mergedStyles = { ...defaultStyles, ...styles };

  // First check if user can view
  const canView = ability.can('view', sectionId);
  if (!canView) {
    return null;
  }

  // Then check if user can edit
  const canEdit = ability.can('edit', sectionId);
  const isReadOnly = readOnly || !canEdit;

  return (
    <input
      data-section-id={sectionId}
      type={type}
      className={className}
      style={mergedStyles}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled || isReadOnly}
      readOnly={isReadOnly}
      {...props}
    />
  );
};

