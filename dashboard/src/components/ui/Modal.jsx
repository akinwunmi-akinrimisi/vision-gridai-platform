import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable glass-card modal with overlay.
 * @param {boolean} isOpen - Whether modal is visible
 * @param {Function} onClose - Close handler
 * @param {string} title - Modal title
 * @param {React.ReactNode} children - Modal body content
 * @param {string} maxWidth - Tailwind max-width class (default 'max-w-lg')
 */
export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`
          relative w-full ${maxWidth} animate-in
          bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl
          border border-white/20 dark:border-slate-700/50
          rounded-2xl shadow-2xl shadow-black/[0.08] dark:shadow-black/[0.3]
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 dark:border-white/[0.06]">
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
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
