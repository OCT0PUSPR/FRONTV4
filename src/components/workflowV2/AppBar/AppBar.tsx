import { 
  Undo2, 
  Redo2, 
  Save,
  FolderOpen,
  Download,
  Upload,
  PenLine,
  PenOff,
  MoreVertical,
  Image,
  Archive,
  ArchiveRestore,
  Upload as PublishIcon
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IconSwitch } from './IconSwitch';
import './AppBar.css';

type AppBarProps = {
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
  zoomLevel?: number;
  canUndo?: boolean;
  canRedo?: boolean;
  documentName?: string;
  onDocumentNameChange?: (name: string) => void;
  workflowStatus?: 'active' | 'draft' | 'archived';
  onArchivePublish?: () => void;
  isReadOnly?: boolean;
  onReadOnlyChange?: (readOnly: boolean) => void;
};

export const AppBar = ({
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  onSave,
  onExport,
  onImport,
  zoomLevel = 100,
  canUndo = true,
  canRedo = true,
  documentName = 'Untitled Workflow',
  onDocumentNameChange,
  workflowStatus = 'draft',
  onArchivePublish,
  isReadOnly = false,
  onReadOnlyChange,
}: AppBarProps) => {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(documentName);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Update edited name when documentName prop changes
  useEffect(() => {
    setEditedName(documentName);
  }, [documentName]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameBlur = () => {
    setIsEditingName(false);
    if (onDocumentNameChange && editedName.trim()) {
      onDocumentNameChange(editedName.trim());
    } else {
      setEditedName(documentName);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameBlur();
    } else if (e.key === 'Escape') {
      setEditedName(documentName);
      setIsEditingName(false);
    }
  };

  const toggleReadOnly = () => {
    if (onReadOnlyChange) {
      onReadOnlyChange(!isReadOnly);
    }
  };

  const handleSaveAsImage = () => {
    console.log('Save as image');
    setShowMenu(false);
  };

  const handleArchiveToggle = () => {
    if (onArchivePublish) {
      onArchivePublish();
    }
  };

  const isActive = workflowStatus === 'active';
  const isArchived = workflowStatus === 'archived';
  const buttonText = isActive ? t('Archive') : t('Publish');
  const ButtonIcon = isActive ? Archive : PublishIcon;

  return (
    <div className="app-bar">
      {/* Left Toolbar */}
      <div className="app-bar-toolbar">
        <div className="app-bar-nav-segment">
          <button 
            className="app-bar-button" 
            onClick={onSave} 
            title={`${t('Save')} (Ctrl+S)`}
          >
            <Save size={16} />
          </button>
          <button 
            className="app-bar-button" 
            onClick={onImport} 
            title={t('Import')}
          >
            <FolderOpen size={16} />
          </button>
          <button 
            className="app-bar-button" 
            onClick={onUndo} 
            disabled={!canUndo}
            title={`${t('Undo')} (Ctrl+Z)`}
          >
            <Undo2 size={16} />
          </button>
          <button 
            className="app-bar-button" 
            onClick={onRedo} 
            disabled={!canRedo}
            title={`${t('Redo')} (Ctrl+Shift+Z)`}
          >
            <Redo2 size={16} />
          </button>
        </div>
      </div>

      {/* Center Project Selection */}
      <div className="app-bar-project-selection">
        <span className="app-bar-folder-name">{t('Workflows')} /</span>
        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            className="app-bar-title-input"
            style={{
              background: 'transparent',
              border: '1px solid #3b82f6',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              fontWeight: 'inherit',
              color: 'inherit',
              outline: 'none',
              minWidth: '150px',
            }}
          />
        ) : (
          <span 
            className="app-bar-title"
            onClick={() => setIsEditingName(true)}
            style={{ cursor: 'pointer' }}
            title="Click to edit workflow name"
          >
            {documentName}
          </span>
        )}
      </div>

      {/* Right Controls */}
      <div className="app-bar-controls">
        {/* Archive/Unarchive Button */}
        <button 
          className={`app-bar-button ${isArchived ? 'app-bar-button-success' : ''}`}
          onClick={handleArchiveToggle}
          title={isArchived ? t('Unarchive Workflow') : t('Archive Workflow')}
        >
          {isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
        </button>

        {/* Edit Mode Toggle */}
        <IconSwitch
          checked={isReadOnly}
          onChange={toggleReadOnly}
          icon={<PenLine size={16} />}
          IconChecked={<PenOff size={16} />}
          title={isReadOnly ? t('Enable Editing') : t('Disable Editing')}
        />

        {/* More Menu */}
        <div className="app-bar-menu-container">
          <button 
            className="app-bar-button" 
            onClick={() => setShowMenu(!showMenu)}
            title={t('More options')}
          >
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <div className="app-bar-dropdown app-bar-dropdown-right">
              <button
                className="app-bar-dropdown-item"
                onClick={() => { onExport(); setShowMenu(false); }}
              >
                <Download size={14} />
                <span>{t('Export')}</span>
              </button>
              <button
                className="app-bar-dropdown-item"
                onClick={() => { onImport(); setShowMenu(false); }}
              >
                <Upload size={14} />
                <span>{t('Import')}</span>
              </button>
              <button
                className="app-bar-dropdown-item"
                onClick={handleSaveAsImage}
              >
                <Image size={14} />
                <span>{t('Save as Image')}</span>
              </button>
              <div className="app-bar-dropdown-separator" />
              <button
                className={`app-bar-dropdown-item ${isActive ? 'app-bar-dropdown-item-destructive' : ''}`}
                onClick={() => { if (onArchivePublish) onArchivePublish(); setShowMenu(false); }}
              >
                <ButtonIcon size={14} />
                <span>{buttonText}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
