import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Right-side slide-in panel (Linear-style detail panel).
 * @param {boolean} isOpen - Whether panel is visible
 * @param {Function} onClose - Close handler
 * @param {string} title - Panel title
 * @param {React.ReactNode} children - Panel body content
 * @param {string} width - Tailwind width class (default 'w-[480px]')
 */
export default function SidePanel({ isOpen, onClose, title, children, width = 'w-[480px]' }) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <aside
        className={`
          fixed right-0 top-0 h-full z-50 ${width} max-w-full
          bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
          border-l border-border/50 dark:border-white/[0.06]
          shadow-2xl shadow-black/[0.1] dark:shadow-black/[0.4]
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 dark:border-white/[0.06] flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="
              p-1.5 rounded-lg
              text-slate-400 hover:text-slate-900 dark:hover:text-white
              hover:bg-slate-100 dark:hover:bg-white/[0.06]
              transition-colors duration-200 cursor-pointer
            "
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">
          {children}
        </div>
      </aside>
    </>
  );
}
