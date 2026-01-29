/**
 * Template Builder Page
 * Full-page template builder for creating and editing XML templates
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/theme';
import { TemplateBuilder } from '../components/templateBuilder/TemplateBuilder';
import * as templateBuilderService from '../services/templateBuilder.service';
import {
  XmlTemplate,
  DocumentType,
  CreateTemplateInput
} from '../types/templateBuilder.types';

export const TemplateBuilderPage: React.FC = () => {
  const { colors } = useTheme();
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();
  const [searchParams] = useSearchParams();

  const isNew = !templateId || templateId === 'new';
  const documentType = searchParams.get('type') as DocumentType | null;

  const [template, setTemplate] = useState<XmlTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLock, setHasLock] = useState(false);

  // Load template or create new
  useEffect(() => {
    loadTemplate();

    // Cleanup - release lock on unmount
    return () => {
      if (hasLock && template?.id) {
        templateBuilderService.releaseLock(template.id).catch(console.error);
      }
    };
  }, [templateId]);

  const loadTemplate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isNew) {
        // Create a new template object
        const newTemplate: XmlTemplate = {
          id: 0,
          template_key: `template_${Date.now()}`,
          template_name: 'Untitled Template',
          description: '',
          document_type: documentType || 'delivery_note',
          xml_content: '',
          date_format: 'DD/MM/YYYY',
          currency_symbol: 'SAR',
          default_decimal_precision: 2,
          is_favorite: false,
          created_by: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setTemplate(newTemplate);
      } else {
        // Load existing template
        const id = parseInt(templateId!, 10);
        const loadedTemplate = await templateBuilderService.getTemplate(id);
        setTemplate(loadedTemplate);

        // Try to acquire lock
        const lockResult = await templateBuilderService.acquireLock(id);
        if (lockResult.success) {
          setHasLock(true);
        } else {
          setError(`Template is being edited by another user. You can view but not edit.`);
        }
      }
    } catch (err) {
      console.error('Failed to load template:', err);
      setError('Failed to load template. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (xmlContent: string) => {
    if (!template) return;

    try {
      if (isNew) {
        // Create new template
        const createData: CreateTemplateInput = {
          template_key: template.template_key,
          template_name: template.template_name,
          description: template.description,
          document_type: template.document_type,
          xml_content: xmlContent,
          date_format: template.date_format,
          currency_symbol: template.currency_symbol,
          default_decimal_precision: template.default_decimal_precision
        };

        const result = await templateBuilderService.createTemplate(createData);

        // Navigate to the created template
        navigate(`/template-builder/${result.templateId}`, { replace: true });

        // Acquire lock for the new template
        await templateBuilderService.acquireLock(result.templateId);
        setHasLock(true);

        // Update local state
        const savedTemplate = await templateBuilderService.getTemplate(result.templateId);
        setTemplate(savedTemplate);
      } else {
        // Update existing template
        await templateBuilderService.updateTemplate(template.id, {
          xml_content: xmlContent
        });

        // Refresh template
        const updatedTemplate = await templateBuilderService.getTemplate(template.id);
        setTemplate(updatedTemplate);
      }
    } catch (err) {
      console.error('Failed to save template:', err);
      throw err;
    }
  };

  const handleBack = async () => {
    // Release lock before leaving
    if (hasLock && template?.id) {
      try {
        await templateBuilderService.releaseLock(template.id);
      } catch (err) {
        console.error('Failed to release lock:', err);
      }
    }

    navigate('/report-templates');
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ background: colors.background }}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2
            size={48}
            className="animate-spin"
            style={{ color: colors.action }}
          />
          <p style={{ color: colors.textSecondary }}>
            Loading template builder...
          </p>
        </div>
      </div>
    );
  }

  // Error state (without template)
  if (error && !template) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ background: colors.background }}
      >
        <div className="flex flex-col items-center gap-4 max-w-md text-center p-8">
          <AlertCircle
            size={48}
            style={{ color: '#ef4444' }}
          />
          <h2
            className="text-xl font-bold"
            style={{ color: colors.textPrimary }}
          >
            Failed to Load Template
          </h2>
          <p style={{ color: colors.textSecondary }}>
            {error}
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 rounded-lg flex items-center gap-2"
            style={{
              background: colors.action,
              color: '#fff'
            }}
          >
            <ArrowLeft size={18} />
            Back to Templates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Warning banner if no lock */}
      {error && template && (
        <div
          className="px-4 py-2 text-sm flex items-center justify-center gap-2"
          style={{
            background: `${colors.pillWarningBg}30`,
            color: colors.tableWaitingText,
            borderBottom: `1px solid ${colors.tableWaitingText}40`
          }}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Builder */}
      {template && (
        <TemplateBuilder
          template={template}
          onSave={handleSave}
          onBack={handleBack}
          isNew={isNew}
        />
      )}
    </div>
  );
};

export default TemplateBuilderPage;
