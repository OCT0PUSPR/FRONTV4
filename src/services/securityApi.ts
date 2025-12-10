// =============================================
// securityApi.ts
// API client for Security microservice
// =============================================

import { API_CONFIG } from '../config/api';

const SECURITY_BASE_URL = `${API_CONFIG.BACKEND_BASE_URL}/api/v1/security`;
const PERSONALIZATION_BASE_URL = `${API_CONFIG.BACKEND_BASE_URL}/api/v1/personalization`;

/**
 * Security API Service
 * Handles all communication with the security microservice
 */
export class SecurityApiService {
  /**
   * Get session headers for API requests
   */
  private static getHeaders(sessionId?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (sessionId) {
      headers['X-Session-ID'] = sessionId;
    }
    return headers;
  }

  /**
   * Check if user has access to a page
   */
  static async checkPageAccess(
    pageId: string,
    userId: string | number,
    sessionId?: string
  ): Promise<{ canView: boolean; canEdit: boolean }> {
    try {
      const response = await fetch(
        `${SECURITY_BASE_URL}/user/page/${pageId}/access?user_id=${userId}`,
        {
          method: 'GET',
          headers: this.getHeaders(sessionId),
        }
      );

      if (!response.ok) {
        return { canView: false, canEdit: false };
      }

      const data = await response.json();
      return {
        canView: data.access?.canView || false,
        canEdit: data.access?.canEdit || false,
      };
    } catch (error) {
      console.error('Error checking page access:', error);
      return { canView: false, canEdit: false };
    }
  }

  /**
   * Check if user has access to a section
   */
  static async checkSectionAccess(
    sectionId: string,
    action: 'view' | 'edit' | 'execute',
    userId: string | number,
    sessionId?: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${SECURITY_BASE_URL}/user/check-access`, {
        method: 'POST',
        headers: this.getHeaders(sessionId),
        body: JSON.stringify({
          section_id: sectionId,
          action,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.hasAccess || false;
    } catch (error) {
      console.error('Error checking section access:', error);
      return false;
    }
  }

  /**
   * Get full page configuration with permissions
   */
  static async getPageConfiguration(
    pageId: string,
    userId: string | number,
    sessionId?: string
  ): Promise<any> {
    try {
      const response = await fetch(
        `${SECURITY_BASE_URL}/pages/${pageId}/configuration?user_id=${userId}`,
        {
          method: 'GET',
          headers: this.getHeaders(sessionId),
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.configuration || null;
    } catch (error) {
      console.error('Error getting page configuration:', error);
      return null;
    }
  }

  /**
   * Get all sections for a page
   */
  static async getPageSections(
    pageId: string,
    sessionId?: string
  ): Promise<any[]> {
    try {
      const response = await fetch(
        `${SECURITY_BASE_URL}/sections/page/${pageId}`,
        {
          method: 'GET',
          headers: this.getHeaders(sessionId),
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.sections || [];
    } catch (error) {
      console.error('Error getting page sections:', error);
      return [];
    }
  }

  /**
   * Get user's accessible pages
   */
  static async getAccessiblePages(
    userId: string | number,
    sessionId?: string
  ): Promise<string[]> {
    try {
      const response = await fetch(
        `${SECURITY_BASE_URL}/user/accessible-pages?user_id=${userId}`,
        {
          method: 'GET',
          headers: this.getHeaders(sessionId),
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.pages || [];
    } catch (error) {
      console.error('Error getting accessible pages:', error);
      return [];
    }
  }
}

/**
 * Personalization API Service
 * Handles all communication with the personalization microservice
 */
export class PersonalizationApiService {
  /**
   * Get session headers for API requests
   */
  private static getHeaders(sessionId?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (sessionId) {
      headers['X-Session-ID'] = sessionId;
    }
    return headers;
  }

  /**
   * Get styles for a section (both light and dark themes)
   */
  static async getSectionStyles(
    sectionId: string,
    theme: 'light' | 'dark' = 'light',
    sessionId?: string
  ): Promise<any> {
    try {
      const response = await fetch(
        `${PERSONALIZATION_BASE_URL}/styles/${sectionId}?theme=${theme}`,
        {
          method: 'GET',
          headers: this.getHeaders(sessionId),
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.styles || null;
    } catch (error) {
      console.error('Error getting section styles:', error);
      return null;
    }
  }

  /**
   * Get all styles for a page
   */
  static async getPageStyles(
    pageId: string,
    theme: 'light' | 'dark' = 'light',
    sessionId?: string
  ): Promise<Record<string, any>> {
    try {
      const response = await fetch(
        `${PERSONALIZATION_BASE_URL}/styles/page/${pageId}?theme=${theme}`,
        {
          method: 'GET',
          headers: this.getHeaders(sessionId),
        }
      );

      if (!response.ok) {
        return {};
      }

      const data = await response.json();
      return data.styles || {};
    } catch (error) {
      console.error('Error getting page styles:', error);
      return {};
    }
  }
}

