// =============================================
// StyledSection.tsx
// Wrapper component that applies custom styles
// =============================================

"use client"

import React, { ReactNode, CSSProperties } from 'react';
import { useSectionStyles } from '../hooks/useSectionStyles';
import { usePermissions } from '../hooks/usePermissions';

interface StyledSectionProps {
  sectionId: string;
  defaultStyles?: CSSProperties;
  className?: string;
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
  [key: string]: any; // Allow other props
}

/**
 * StyledSection Component
 * 
 * Wraps content and applies custom styles from the personalization system.
 * Styles are automatically merged with default styles.
 * 
 * @example
 * <StyledSection 
 *   sectionId="attributes-header"
 *   defaultStyles={{ padding: '1rem' }}
 * >
 *   <h1>Attributes</h1>
 * </StyledSection>
 */
export const StyledSection: React.FC<StyledSectionProps> = ({
  sectionId,
  defaultStyles = {},
  className,
  children,
  as: Component = 'div',
  ...props
}) => {
  const { styles, isLoading } = useSectionStyles({
    sectionId,
    defaultStyles,
    autoLoad: true,
  });

  // Merge className if provided
  const mergedClassName = className ? className : undefined;

  return (
    <Component 
      data-section-id={sectionId}
      className={mergedClassName} 
      style={styles} 
      {...props}
    >
      {children}
    </Component>
  );
};

interface StyledButtonProps {
  sectionId: string;
  defaultStyles?: CSSProperties;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  [key: string]: any;
}

/**
 * StyledButton Component
 * 
 * Button with custom styles applied from personalization system.
 * 
 * @example
 * <StyledButton 
 *   sectionId="attributes-header-add-button"
 *   onClick={handleAdd}
 * >
 *   Add Attribute
 * </StyledButton>
 */
export const StyledButton: React.FC<StyledButtonProps> = ({
  sectionId,
  defaultStyles = {},
  className,
  children,
  onClick,
  disabled,
  ...props
}) => {
  const { styles } = useSectionStyles({
    sectionId,
    defaultStyles,
    autoLoad: true,
  });

  return (
    <button
      data-section-id={sectionId}
      className={className}
      style={styles}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

interface StyledInputProps {
  sectionId: string;
  defaultStyles?: CSSProperties;
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  [key: string]: any;
}

/**
 * StyledInput Component
 * 
 * Input field with custom styles applied from personalization system.
 * 
 * @example
 * <StyledInput 
 *   sectionId="attributes-search-input"
 *   placeholder="Search attributes..."
 *   value={searchQuery}
 *   onChange={(e) => setSearchQuery(e.target.value)}
 * />
 */
export const StyledInput: React.FC<StyledInputProps> = ({
  sectionId,
  defaultStyles = {},
  className,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
  ...props
}) => {
  const { styles } = useSectionStyles({
    sectionId,
    defaultStyles,
    autoLoad: true,
  });

  return (
    <input
      data-section-id={sectionId}
      type={type}
      className={className}
      style={styles}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      {...props}
    />
  );
};

/**
 * CombinedSecuredStyledSection Component
 * 
 * Combines both security and styling in one component.
 * Only renders if user has permission, and applies custom styles.
 * 
 * @example
 * <CombinedSecuredStyledSection 
 *   sectionId="attributes-header"
 *   pageId="attributes"
 *   defaultStyles={{ padding: '1rem' }}
 * >
 *   <h1>Attributes</h1>
 * </CombinedSecuredStyledSection>
 */
export const CombinedSecuredStyledSection: React.FC<StyledSectionProps & {
  pageId?: string;
  fallback?: ReactNode;
  hideIfNoAccess?: boolean;
}> = ({
  sectionId,
  pageId,
  defaultStyles = {},
  className,
  children,
  fallback,
  hideIfNoAccess = true,
  as: Component = 'div',
  ...props
}) => {
  const { styles, isLoading } = useSectionStyles({
    sectionId,
    defaultStyles,
    autoLoad: true,
  });

  const { canView: hasPermission } = usePermissions({ sectionId, pageId, autoCheck: true });

  if (isLoading) {
    return null;
  }

  if (!hasPermission && hideIfNoAccess) {
    return null;
  }

  if (!hasPermission && fallback) {
    return <>{fallback}</>;
  }

  if (!hasPermission) {
    return null;
  }

  return (
    <Component 
      data-section-id={sectionId}
      className={className} 
      style={styles} 
      {...props}
    >
      {children}
    </Component>
  );
};

