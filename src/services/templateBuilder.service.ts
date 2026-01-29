/**
 * Template Builder Service
 * API service for XML template builder operations
 */

import { API_CONFIG, getTenantHeaders } from '../config/api';
import {
  XmlTemplate,
  XmlTemplateListItem,
  CreateTemplateInput,
  UpdateTemplateInput,
  Logo,
  Stamp,
  UploadAssetInput,
  TemplateBlock,
  CreateBlockInput,
  TemplateRole,
  UserPermissions,
  CreateRoleInput,
  AutosaveInput,
  Autosave,
  DocumentTypeInfo,
  TemplateFilters,
  TemplateSortOptions
} from '../types/templateBuilder.types';

const BASE_URL = `${API_CONFIG.BACKEND_BASE_URL}/reports`;

// Helper for handling responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

// ============================================================
// Document Types
// ============================================================

export async function getDocumentTypes(): Promise<DocumentTypeInfo[]> {
  const response = await fetch(`${BASE_URL}/document-types`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ documentTypes: DocumentTypeInfo[] }>(response);
  return data.documentTypes;
}

// ============================================================
// XML Templates
// ============================================================

export async function listTemplates(
  filters?: TemplateFilters,
  sort?: TemplateSortOptions
): Promise<XmlTemplateListItem[]> {
  const params = new URLSearchParams();

  if (filters?.documentType) params.append('documentType', filters.documentType);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.createdBy) params.append('createdBy', String(filters.createdBy));

  if (sort?.sortBy) params.append('sortBy', sort.sortBy);
  if (sort?.sortOrder) params.append('sortOrder', sort.sortOrder);

  const response = await fetch(`${BASE_URL}/xml-templates?${params.toString()}`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ templates: XmlTemplateListItem[] }>(response);
  return data.templates;
}

export async function getFavoriteTemplates(): Promise<XmlTemplateListItem[]> {
  const response = await fetch(`${BASE_URL}/xml-templates/favorites`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ templates: XmlTemplateListItem[] }>(response);
  return data.templates;
}

export async function getRecentTemplates(limit = 5): Promise<XmlTemplateListItem[]> {
  const response = await fetch(`${BASE_URL}/xml-templates/recent?limit=${limit}`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ templates: XmlTemplateListItem[] }>(response);
  return data.templates;
}

export async function getTemplate(templateId: number): Promise<XmlTemplate> {
  const response = await fetch(`${BASE_URL}/xml-templates/${templateId}`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ template: XmlTemplate }>(response);
  return data.template;
}

export async function createTemplate(data: CreateTemplateInput): Promise<{ templateId: number }> {
  const response = await fetch(`${BASE_URL}/xml-templates`, {
    method: 'POST',
    headers: getTenantHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleResponse<{ templateId: number }>(response);
  return { templateId: result.templateId };
}

export async function updateTemplate(templateId: number, data: UpdateTemplateInput): Promise<void> {
  const response = await fetch(`${BASE_URL}/xml-templates/${templateId}`, {
    method: 'PUT',
    headers: getTenantHeaders(),
    body: JSON.stringify(data)
  });
  await handleResponse<void>(response);
}

export async function deleteTemplate(templateId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/xml-templates/${templateId}`, {
    method: 'DELETE',
    headers: getTenantHeaders()
  });
  await handleResponse<void>(response);
}

export async function duplicateTemplate(templateId: number, name?: string): Promise<{ templateId: number }> {
  const response = await fetch(`${BASE_URL}/xml-templates/${templateId}/duplicate`, {
    method: 'POST',
    headers: getTenantHeaders(),
    body: JSON.stringify({ name })
  });
  const result = await handleResponse<{ templateId: number }>(response);
  return { templateId: result.templateId };
}

export async function toggleFavorite(templateId: number): Promise<{ is_favorite: boolean }> {
  const response = await fetch(`${BASE_URL}/xml-templates/${templateId}/favorite`, {
    method: 'POST',
    headers: getTenantHeaders()
  });
  const result = await handleResponse<{ is_favorite: boolean }>(response);
  return { is_favorite: result.is_favorite };
}

export async function acquireLock(templateId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${BASE_URL}/xml-templates/${templateId}/lock`, {
      method: 'POST',
      headers: getTenantHeaders()
    });
    await handleResponse<void>(response);
    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    return { success: false, error: err.message };
  }
}

export async function releaseLock(templateId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/xml-templates/${templateId}/unlock`, {
    method: 'POST',
    headers: getTenantHeaders()
  });
  await handleResponse<void>(response);
}

export async function exportTemplate(templateId: number): Promise<Blob> {
  const response = await fetch(`${BASE_URL}/xml-templates/${templateId}/export`, {
    method: 'POST',
    headers: getTenantHeaders()
  });
  if (!response.ok) {
    throw new Error('Export failed');
  }
  return response.blob();
}

export async function importTemplate(data: CreateTemplateInput): Promise<{ templateId: number }> {
  const response = await fetch(`${BASE_URL}/xml-templates/import`, {
    method: 'POST',
    headers: getTenantHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleResponse<{ templateId: number }>(response);
  return { templateId: result.templateId };
}

export async function generatePreview(
  templateId: number,
  data: Record<string, unknown>,
  language: 'en' | 'ar' = 'en'
): Promise<string> {
  const response = await fetch(`${BASE_URL}/xml-templates/${templateId}/preview`, {
    method: 'POST',
    headers: getTenantHeaders(),
    body: JSON.stringify({ data, language })
  });
  const result = await handleResponse<{ html: string }>(response);
  return result.html;
}

// ============================================================
// Autosave
// ============================================================

export async function saveAutosave(data: AutosaveInput): Promise<void> {
  const response = await fetch(`${BASE_URL}/xml-templates/autosave`, {
    method: 'POST',
    headers: getTenantHeaders(),
    body: JSON.stringify(data)
  });
  await handleResponse<void>(response);
}

export async function getAutosave(templateId?: number): Promise<Autosave | null> {
  const url = templateId
    ? `${BASE_URL}/xml-templates/autosave/${templateId}`
    : `${BASE_URL}/xml-templates/autosave/new`;

  try {
    const response = await fetch(url, {
      headers: getTenantHeaders()
    });
    const data = await handleResponse<{ autosave: Autosave }>(response);
    return data.autosave;
  } catch {
    return null;
  }
}

// ============================================================
// Logos
// ============================================================

export async function listLogos(): Promise<Logo[]> {
  const response = await fetch(`${BASE_URL}/assets/logos`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ logos: Logo[] }>(response);
  return data.logos;
}

export async function getLogo(logoId: number): Promise<Logo> {
  const response = await fetch(`${BASE_URL}/assets/logos/${logoId}`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ logo: Logo }>(response);
  return data.logo;
}

export async function getLogoDataUrl(logoId: number): Promise<string> {
  const response = await fetch(`${BASE_URL}/assets/logos/${logoId}/data-url`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ dataUrl: string }>(response);
  return data.dataUrl;
}

export async function uploadLogo(data: UploadAssetInput): Promise<{ logoId: number }> {
  const response = await fetch(`${BASE_URL}/assets/logos`, {
    method: 'POST',
    headers: getTenantHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleResponse<{ logoId: number }>(response);
  return { logoId: result.logoId };
}

export async function updateLogo(logoId: number, name: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/assets/logos/${logoId}`, {
    method: 'PUT',
    headers: getTenantHeaders(),
    body: JSON.stringify({ name })
  });
  await handleResponse<void>(response);
}

export async function deleteLogo(logoId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/assets/logos/${logoId}`, {
    method: 'DELETE',
    headers: getTenantHeaders()
  });
  await handleResponse<void>(response);
}

// ============================================================
// Stamps
// ============================================================

export async function listStamps(): Promise<Stamp[]> {
  const response = await fetch(`${BASE_URL}/assets/stamps`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ stamps: Stamp[] }>(response);
  return data.stamps;
}

export async function getStamp(stampId: number): Promise<Stamp> {
  const response = await fetch(`${BASE_URL}/assets/stamps/${stampId}`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ stamp: Stamp }>(response);
  return data.stamp;
}

export async function getStampDataUrl(stampId: number): Promise<string> {
  const response = await fetch(`${BASE_URL}/assets/stamps/${stampId}/data-url`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ dataUrl: string }>(response);
  return data.dataUrl;
}

export async function uploadStamp(data: UploadAssetInput): Promise<{ stampId: number }> {
  const response = await fetch(`${BASE_URL}/assets/stamps`, {
    method: 'POST',
    headers: getTenantHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleResponse<{ stampId: number }>(response);
  return { stampId: result.stampId };
}

export async function updateStamp(stampId: number, name: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/assets/stamps/${stampId}`, {
    method: 'PUT',
    headers: getTenantHeaders(),
    body: JSON.stringify({ name })
  });
  await handleResponse<void>(response);
}

export async function deleteStamp(stampId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/assets/stamps/${stampId}`, {
    method: 'DELETE',
    headers: getTenantHeaders()
  });
  await handleResponse<void>(response);
}

// ============================================================
// Blocks
// ============================================================

export async function listBlocks(blockType?: string): Promise<TemplateBlock[]> {
  const params = blockType ? `?blockType=${blockType}` : '';
  const response = await fetch(`${BASE_URL}/blocks${params}`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ blocks: TemplateBlock[] }>(response);
  return data.blocks;
}

export async function listSharedBlocks(blockType?: string): Promise<TemplateBlock[]> {
  const params = blockType ? `?blockType=${blockType}` : '';
  const response = await fetch(`${BASE_URL}/blocks/shared${params}`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ blocks: TemplateBlock[] }>(response);
  return data.blocks;
}

export async function getBlock(blockId: number): Promise<TemplateBlock> {
  const response = await fetch(`${BASE_URL}/blocks/${blockId}`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ block: TemplateBlock }>(response);
  return data.block;
}

export async function createBlock(data: CreateBlockInput): Promise<{ blockId: number }> {
  const response = await fetch(`${BASE_URL}/blocks`, {
    method: 'POST',
    headers: getTenantHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleResponse<{ blockId: number }>(response);
  return { blockId: result.blockId };
}

export async function updateBlock(blockId: number, data: Partial<CreateBlockInput>): Promise<void> {
  const response = await fetch(`${BASE_URL}/blocks/${blockId}`, {
    method: 'PUT',
    headers: getTenantHeaders(),
    body: JSON.stringify(data)
  });
  await handleResponse<void>(response);
}

export async function deleteBlock(blockId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/blocks/${blockId}`, {
    method: 'DELETE',
    headers: getTenantHeaders()
  });
  await handleResponse<void>(response);
}

export async function shareBlock(blockId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/blocks/${blockId}/share`, {
    method: 'POST',
    headers: getTenantHeaders()
  });
  await handleResponse<void>(response);
}

export async function unshareBlock(blockId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/blocks/${blockId}/unshare`, {
    method: 'POST',
    headers: getTenantHeaders()
  });
  await handleResponse<void>(response);
}

export async function duplicateBlock(blockId: number, name?: string): Promise<{ blockId: number }> {
  const response = await fetch(`${BASE_URL}/blocks/${blockId}/duplicate`, {
    method: 'POST',
    headers: getTenantHeaders(),
    body: JSON.stringify({ name })
  });
  const result = await handleResponse<{ blockId: number }>(response);
  return { blockId: result.blockId };
}

export async function searchBlocks(query: string): Promise<TemplateBlock[]> {
  const response = await fetch(`${BASE_URL}/blocks/search?q=${encodeURIComponent(query)}`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ blocks: TemplateBlock[] }>(response);
  return data.blocks;
}

export async function getBlockTypes(): Promise<string[]> {
  const response = await fetch(`${BASE_URL}/blocks/types`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ types: string[] }>(response);
  return data.types;
}

// ============================================================
// Roles & Permissions
// ============================================================

export async function listRoles(): Promise<TemplateRole[]> {
  const response = await fetch(`${BASE_URL}/roles`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ roles: TemplateRole[] }>(response);
  return data.roles;
}

export async function getRole(roleId: number): Promise<TemplateRole> {
  const response = await fetch(`${BASE_URL}/roles/${roleId}`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ role: TemplateRole }>(response);
  return data.role;
}

export async function createRole(data: CreateRoleInput): Promise<{ roleId: number }> {
  const response = await fetch(`${BASE_URL}/roles`, {
    method: 'POST',
    headers: getTenantHeaders(),
    body: JSON.stringify(data)
  });
  const result = await handleResponse<{ roleId: number }>(response);
  return { roleId: result.roleId };
}

export async function updateRole(roleId: number, data: Partial<CreateRoleInput>): Promise<void> {
  const response = await fetch(`${BASE_URL}/roles/${roleId}`, {
    method: 'PUT',
    headers: getTenantHeaders(),
    body: JSON.stringify(data)
  });
  await handleResponse<void>(response);
}

export async function deleteRole(roleId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/roles/${roleId}`, {
    method: 'DELETE',
    headers: getTenantHeaders()
  });
  await handleResponse<void>(response);
}

export async function getMyPermissions(): Promise<UserPermissions> {
  const response = await fetch(`${BASE_URL}/permissions/me`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ permissions: UserPermissions }>(response);
  return data.permissions;
}

export async function getUserRoles(userId: number): Promise<TemplateRole[]> {
  const response = await fetch(`${BASE_URL}/user-roles/${userId}`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ roles: TemplateRole[] }>(response);
  return data.roles;
}

export async function assignRole(userId: number, roleId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/user-roles`, {
    method: 'POST',
    headers: getTenantHeaders(),
    body: JSON.stringify({ user_id: userId, role_id: roleId })
  });
  await handleResponse<void>(response);
}

export async function removeRole(userId: number, roleId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/user-roles/${userId}/${roleId}`, {
    method: 'DELETE',
    headers: getTenantHeaders()
  });
  await handleResponse<void>(response);
}

// ============================================================
// Template Access
// ============================================================

export async function getTemplateRoles(templateId: number): Promise<TemplateRole[]> {
  const response = await fetch(`${BASE_URL}/xml-templates/${templateId}/roles`, {
    headers: getTenantHeaders()
  });
  const data = await handleResponse<{ roles: TemplateRole[] }>(response);
  return data.roles;
}

export async function setTemplateRoles(templateId: number, roleIds: number[]): Promise<void> {
  const response = await fetch(`${BASE_URL}/xml-templates/${templateId}/roles`, {
    method: 'PUT',
    headers: getTenantHeaders(),
    body: JSON.stringify({ role_ids: roleIds })
  });
  await handleResponse<void>(response);
}

export async function grantTemplateAccess(templateId: number, roleId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/xml-templates/${templateId}/roles`, {
    method: 'POST',
    headers: getTenantHeaders(),
    body: JSON.stringify({ role_id: roleId })
  });
  await handleResponse<void>(response);
}

export async function revokeTemplateAccess(templateId: number, roleId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/xml-templates/${templateId}/roles/${roleId}`, {
    method: 'DELETE',
    headers: getTenantHeaders()
  });
  await handleResponse<void>(response);
}

// ============================================================
// Utility Functions
// ============================================================

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default {
  // Document Types
  getDocumentTypes,

  // Templates
  listTemplates,
  getFavoriteTemplates,
  getRecentTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  toggleFavorite,
  acquireLock,
  releaseLock,
  exportTemplate,
  importTemplate,
  generatePreview,

  // Autosave
  saveAutosave,
  getAutosave,

  // Logos
  listLogos,
  getLogo,
  getLogoDataUrl,
  uploadLogo,
  updateLogo,
  deleteLogo,

  // Stamps
  listStamps,
  getStamp,
  getStampDataUrl,
  uploadStamp,
  updateStamp,
  deleteStamp,

  // Blocks
  listBlocks,
  listSharedBlocks,
  getBlock,
  createBlock,
  updateBlock,
  deleteBlock,
  shareBlock,
  unshareBlock,
  duplicateBlock,
  searchBlocks,
  getBlockTypes,

  // Roles
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  getMyPermissions,
  getUserRoles,
  assignRole,
  removeRole,

  // Template Access
  getTemplateRoles,
  setTemplateRoles,
  grantTemplateAccess,
  revokeTemplateAccess,

  // Utils
  fileToBase64,
  downloadBlob
};
