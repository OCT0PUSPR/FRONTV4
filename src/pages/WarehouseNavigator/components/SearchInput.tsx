// Search Input Component for filtering locations

import { useCallback, useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../context/theme';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  const { t } = useTranslation();
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Handle clear
  const handleClear = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  // Handle keyboard shortcut (Ctrl/Cmd + F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className={`
        relative flex items-center rounded-lg border transition-all duration-200
        ${isFocused ? 'ring-2 ring-blue-500' : ''}
      `}
      style={{
        backgroundColor: colors.mutedBg,
        borderColor: isFocused ? '#3b82f6' : colors.border,
      }}
    >
      <Search
        className="absolute left-3 h-4 w-4 pointer-events-none"
        style={{ color: colors.textSecondary }}
      />

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder || t('warehouse_navigator.search_placeholder', 'Search locations...')}
        className="w-full py-2 pl-10 pr-8 text-sm rounded-lg bg-transparent focus:outline-none"
        style={{
          color: colors.textPrimary,
        }}
      />

      {value && (
        <button
          onClick={handleClear}
          className="absolute right-2 p-1 rounded transition-colors"
          style={{ color: colors.textSecondary }}
          title={t('warehouse_navigator.clear_search', 'Clear search')}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
