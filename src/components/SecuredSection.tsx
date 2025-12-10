// =============================================
// SecuredSection.tsx
// Wrapper component that applies permission checks
// =============================================

"use client"

import React, { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface SecuredSectionProps {
  sectionId: string;
  pageId?: string;
  fallback?: ReactNode;
  hideIfNoAccess?: boolean;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * SecuredSection Component
 * 
 * Wraps content and only renders it if user has view permission.
 * Can optionally hide content or show fallback if no access.
 * 
 * @example
 * <SecuredSection sectionId="attributes-header-add-button">
 *   <Button>Add Attribute</Button>
 * </SecuredSection>
 */
export const SecuredSection: React.FC<SecuredSectionProps> = ({
  sectionId,
  pageId,
  fallback = null,
  hideIfNoAccess = true,
  children,
  className,
  style,
}) => {
  const { canView, isLoading } = usePermissions({ sectionId, pageId, autoCheck: true });

  // Show loading state (optional - you can remove this if you want instant render)
  if (isLoading) {
    return null; // or a loading spinner
  }

  // If no access and hideIfNoAccess is true, don't render
  if (!canView && hideIfNoAccess) {
    return null;
  }

  // If no access but fallback provided, show fallback
  if (!canView && fallback) {
    return <>{fallback}</>;
  }

  // If no access and no fallback, don't render
  if (!canView) {
    return null;
  }

  // Render children with data-section-id attribute and optional className and style
  if (className || style) {
    return (
      <div 
        data-section-id={sectionId}
        className={className} 
        style={style}
      >
        {children}
      </div>
    );
  }

  return (
    <div data-section-id={sectionId}>
      {children}
    </div>
  );
};

interface SecuredButtonProps {
  sectionId: string;
  pageId?: string;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any; // Allow other button props
}

/**
 * SecuredButton Component
 * 
 * Button that is disabled if user doesn't have execute permission.
 * 
 * @example
 * <SecuredButton sectionId="attributes-modal-save-button" onClick={handleSave}>
 *   Save
 * </SecuredButton>
 */
export const SecuredButton: React.FC<SecuredButtonProps> = ({
  sectionId,
  pageId,
  disabled = false,
  onClick,
  children,
  className,
  style,
  ...props
}) => {
  const { canExecute, isLoading } = usePermissions({ sectionId, pageId, autoCheck: true });

  const handleClick = () => {
    if (canExecute && onClick) {
      onClick();
    }
  };

  return (
    <button
      data-section-id={sectionId}
      className={className}
      style={style}
      disabled={disabled || !canExecute || isLoading}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
};

interface SecuredInputProps {
  sectionId: string;
  pageId?: string;
  disabled?: boolean;
  readOnly?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

/**
 * SecuredInput Component
 * 
 * Input field that is disabled/readonly if user doesn't have edit permission.
 * 
 * @example
 * <SecuredInput 
 *   sectionId="attributes-modal-name-field"
 *   value={name}
 *   onChange={(e) => setName(e.target.value)}
 * />
 */
export const SecuredInput: React.FC<SecuredInputProps> = ({
  sectionId,
  pageId,
  disabled = false,
  readOnly = false,
  value,
  onChange,
  className,
  style,
  ...props
}) => {
  const { canEdit, isLoading } = usePermissions({ sectionId, pageId, autoCheck: true });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (canEdit && onChange) {
      onChange(e);
    }
  };

  return (
    <input
      data-section-id={sectionId}
      className={className}
      style={style}
      disabled={disabled || !canEdit || isLoading}
      readOnly={readOnly || !canEdit}
      value={value}
      onChange={handleChange}
      {...props}
    />
  );
};

