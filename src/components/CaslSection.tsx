// =============================================
// CaslSection.tsx
// CASL-based permission components for sections/fields
// =============================================

"use client"

import React, { ReactNode } from 'react';
import { Can } from '@casl/react';
import { useCasl } from '../../context/casl';

interface CaslSectionProps {
  sectionId: string;
  action?: 'view' | 'edit' | 'execute';
  fallback?: ReactNode;
  hideIfNoAccess?: boolean;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * CaslSection Component
 * 
 * Uses CASL to conditionally render sections based on permissions.
 * 
 * @example
 * <CaslSection sectionId="attributes-header-title" action="view">
 *   <h1>Attributes</h1>
 * </CaslSection>
 */
export const CaslSection: React.FC<CaslSectionProps> = ({
  sectionId,
  action = 'view',
  fallback = null,
  hideIfNoAccess = true,
  children,
  className,
  style,
}) => {
  const { ability } = useCasl();

  return (
    <Can I={action} this={sectionId} ability={ability}>
      {(allowed: boolean) => {
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
      }}
    </Can>
  );
};

interface CaslButtonProps {
  sectionId: string;
  action?: 'view' | 'edit' | 'execute';
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

/**
 * CaslButton Component
 * 
 * Button that is disabled/hidden if user doesn't have execute permission.
 * 
 * @example
 * <CaslButton sectionId="attributes-header-add-button" action="execute" onClick={handleAdd}>
 *   Add Attribute
 * </CaslButton>
 */
export const CaslButton: React.FC<CaslButtonProps> = ({
  sectionId,
  action = 'execute',
  disabled = false,
  onClick,
  children,
  className,
  style,
  ...props
}) => {
  const { ability } = useCasl();

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
            style={style}
            disabled={disabled}
            onClick={onClick}
            {...props}
          >
            {children}
          </button>
        );
      }}
    </Can>
  );
};

interface CaslInputProps {
  sectionId: string;
  action?: 'view' | 'edit';
  disabled?: boolean;
  readOnly?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  type?: string;
  [key: string]: any;
}

/**
 * CaslInput Component
 * 
 * Input field that is disabled/hidden if user doesn't have edit permission.
 * 
 * @example
 * <CaslInput 
 *   sectionId="attributes-search-input"
 *   action="edit"
 *   value={searchQuery}
 *   onChange={(e) => setSearchQuery(e.target.value)}
 * />
 */
export const CaslInput: React.FC<CaslInputProps> = ({
  sectionId,
  action = 'edit',
  disabled = false,
  readOnly = false,
  value,
  onChange,
  className,
  style,
  placeholder,
  type = 'text',
  ...props
}) => {
  const { ability } = useCasl();

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
      style={style}
      disabled={disabled || isReadOnly}
      readOnly={isReadOnly}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  );
};

