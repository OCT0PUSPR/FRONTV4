import { DragEvent } from 'react';
import { PaletteItem } from '../../../types/workflow';
import * as LucideIcons from 'lucide-react';
import { PanelLeftOpen, PanelLeftClose, FileStack } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Palette.css';


type PaletteProps = {
  items: PaletteItem[];
  isExpanded: boolean;
  onToggle: () => void;
  isDisabled?: boolean;
  onTemplatesClick?: () => void;
};

export const Palette = ({ items, isExpanded, onToggle, isDisabled, onTemplatesClick }: PaletteProps) => {
  const { t } = useTranslation();
  const onDragStart = (event: DragEvent, nodeType: string) => {
    if (isDisabled) return;
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className={`palette ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="palette-header">
        {isExpanded ? (
          <>
            <h3>{t('Nodes Library')}</h3>
            <button onClick={onToggle} className="palette-toggle" title={t('Close')}>
              <PanelLeftClose size={16} />
            </button>
          </>
        ) : (
          <button onClick={onToggle} className="palette-toggle palette-toggle-collapsed" title={t('Open')}>
            <PanelLeftOpen size={16} />
          </button>
        )}
      </div>

      {isExpanded && (
        <>
          <div className="palette-content-wrapper">
            <div className="palette-content">
              <div className="palette-section">
                <div className="palette-items">
                  {items.map((item) => {
                    const IconComponent = (LucideIcons as any)[item.icon] || LucideIcons.Circle;
                    
                    return (
                      <div
                        key={item.type}
                        className={`palette-item ${isDisabled ? 'disabled' : ''}`}
                        draggable={!isDisabled}
                        onDragStart={(e) => onDragStart(e, item.type)}
                      >
                        <div className="palette-item-icon">
                          <IconComponent size={18} />
                        </div>
                        <div className="palette-item-content">
                          <div className="palette-item-label">{t(item.label)}</div>
                          <div className="palette-item-description">{t(item.description)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="palette-separator" />
          <div className="palette-footer">
            <button 
              className="palette-footer-button"
              onClick={onTemplatesClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <FileStack size={16} />
              {t('Templates')}
            </button>
            <button className="palette-footer-button">{t('Help & Support')}</button>
          </div>
        </>
      )}
    </div>
  );
};

