import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Custom styled dropdown filter matching the glass-card design system.
 * @param {string} label - Display label for the dropdown trigger
 * @param {string} value - Currently selected value
 * @param {Function} onChange - Called with new value on selection
 * @param {Array<{value: string, label: string}>} options - Dropdown options
 */
export default function FilterDropdown({ label, value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : label;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`
          inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
          border transition-all duration-200 cursor-pointer
          ${isOpen
            ? 'bg-white dark:bg-slate-800 border-primary/30 dark:border-blue-400/30 text-primary dark:text-blue-400 shadow-sm'
            : 'bg-white/60 dark:bg-white/[0.04] border-border/50 dark:border-white/[0.06] text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.1]'
          }
        `}
      >
        <span className="text-xs text-text-muted dark:text-text-muted-dark">{label}:</span>
        <span>{displayLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Options dropdown */}
      {isOpen && (
        <div className="
          absolute top-full left-0 mt-1.5 z-30 min-w-[160px]
          bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl
          border border-white/20 dark:border-slate-700/50
          rounded-xl shadow-xl shadow-black/[0.08] dark:shadow-black/[0.3]
          py-1 animate-in
        ">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`
                flex items-center justify-between w-full px-3 py-2 text-sm
                transition-colors duration-150 cursor-pointer
                ${option.value === value
                  ? 'text-primary dark:text-blue-400 bg-primary/[0.05] dark:bg-primary/[0.1] font-medium'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                }
              `}
            >
              <span>{option.label}</span>
              {option.value === value && (
                <Check className="w-3.5 h-3.5 text-primary dark:text-blue-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
