// =============================================
// PageEditor.tsx
// Component for editing page sections with hover visualization
// =============================================

"use client"

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/theme';
import { useTranslation } from 'react-i18next';

// Import all page components
import AttributesPage from '../attributes';
import BatchTransfersPage from '../batch';
import ProductCategoriesPage from '../categories';
import { Dashboard as DashboardPage } from '../dashboard';
import TransferDeliveriesPage from '../deliveries';
import DeliveryMethodsPage from '../deliveryMethods';
import DropshipsPage from '../dropship';
import InternalTransfersPage from '../internal';
// import Inventory from '../inventory'; // TODO: Create inventory component
const Inventory = () => <div>Inventory Page</div>;
import LandedCostsPage from '../landed-costs';
import LocationsPage from '../locations';

interface PageEditorProps {
  pageId: string;
  sections: any[];
  onSectionClick: (section: any) => void;
  colors: any;
}

const PAGE_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'attributes': AttributesPage,
  'batch': BatchTransfersPage,
  'categories': ProductCategoriesPage,
  'dashboard': DashboardPage,
  'deliveries': TransferDeliveriesPage,
  'delivery-methods': DeliveryMethodsPage,
  'dropship': DropshipsPage,
  'internal': InternalTransfersPage,
  'inventory': Inventory,
  'landing-costs': LandedCostsPage,
  'locations': LocationsPage,
};

export function PageEditor({ pageId, sections, onSectionClick, colors }: PageEditorProps) {
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Inject data attributes and event listeners
  useEffect(() => {
    if (!containerRef.current) return;

    const addSectionAttributes = () => {
      sections.forEach((section) => {
        // Try to find element by section ID
        // We'll use a combination of strategies:
        // 1. Look for elements with matching IDs
        // 2. Look for elements with matching class names
        // 3. Use section name to find elements
        
        const selectors = [
          `[data-section-id="${section.section_id}"]`,
          `#${section.section_id}`,
          `.${section.section_id}`,
        ];

        let element: HTMLElement | null = null;
        for (const selector of selectors) {
          element = containerRef.current?.querySelector(selector) as HTMLElement;
          if (element) break;
        }

        // If not found, try to find by section name in text content
        if (!element) {
          const allElements = containerRef.current?.querySelectorAll('*');
          allElements?.forEach((el) => {
            if (el.textContent?.includes(section.section_name)) {
              // Check if this is likely the right element
              const tagName = el.tagName.toLowerCase();
              if (['div', 'section', 'header', 'footer', 'main', 'article'].includes(tagName)) {
                element = el as HTMLElement;
              }
            }
          });
        }

        if (element) {
          // Add data attribute if not present
          if (!element.getAttribute('data-section-id')) {
            element.setAttribute('data-section-id', section.section_id);
          }

          // Add hover listeners
          const handleMouseEnter = () => {
            setHoveredSectionId(section.section_id);
            element?.style.setProperty('border', `2px solid ${colors.action}`, 'important');
            element?.style.setProperty('cursor', 'pointer');
          };

          const handleMouseLeave = () => {
            setHoveredSectionId(null);
            element?.style.removeProperty('border');
            element?.style.removeProperty('cursor');
          };

          const handleClick = (e: MouseEvent) => {
            e.stopPropagation();
            onSectionClick(section);
          };

          element.addEventListener('mouseenter', handleMouseEnter);
          element.addEventListener('mouseleave', handleMouseLeave);
          element.addEventListener('click', handleClick);

          // Store cleanup function
          (element as any)._cleanup = () => {
            element?.removeEventListener('mouseenter', handleMouseEnter);
            element?.removeEventListener('mouseleave', handleMouseLeave);
            element?.removeEventListener('click', handleClick);
          };
        }
      });
    };

    // Wait for page to render
    const timeoutId = setTimeout(addSectionAttributes, 1000);

    return () => {
      clearTimeout(timeoutId);
      // Cleanup event listeners
      sections.forEach((section) => {
        const element = containerRef.current?.querySelector(`[data-section-id="${section.section_id}"]`);
        if (element && (element as any)._cleanup) {
          (element as any)._cleanup();
        }
      });
    };
  }, [sections, colors.action, onSectionClick]);

  // Inject CSS for hover visualization
  useEffect(() => {
    const styleId = 'page-editor-hover-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    const hoverStyles = sections
      .map((section) => {
        const isHovered = section.section_id === hoveredSectionId;
        return `
          [data-section-id="${section.section_id}"] {
            ${isHovered ? `border: 2px solid ${colors.action} !important;` : ''}
            transition: border 0.2s ease;
            position: relative;
          }
          [data-section-id="${section.section_id}"]:hover {
            border: 2px solid ${colors.action} !important;
            cursor: pointer !important;
          }
        `;
      })
      .join('\n');

    styleElement.textContent = hoverStyles;
  }, [hoveredSectionId, sections, colors.action]);

  const PageComponent = PAGE_COMPONENTS[pageId];

  if (!PageComponent) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: colors.textSecondary }}>
        Page component not found for: {pageId}
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <PageComponent />
      {/* Hover indicator */}
      {hoveredSectionId && (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            background: colors.action,
            color: '#FFFFFF',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 10000,
            pointerEvents: 'none',
          }}
        >
          {sections.find((s) => s.section_id === hoveredSectionId)?.section_name || hoveredSectionId}
        </div>
      )}
    </div>
  );
}

