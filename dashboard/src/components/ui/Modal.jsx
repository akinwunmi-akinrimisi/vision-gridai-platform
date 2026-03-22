import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import useMediaQuery from '../../hooks/useMediaQuery';

/**
 * Reusable glass-card modal with overlay.
 * On mobile (< 768px): renders as a bottom sheet with drag-to-dismiss.
 * @param {boolean} isOpen - Whether modal is visible
 * @param {Function} onClose - Close handler
 * @param {string} title - Modal title
 * @param {React.ReactNode} children - Modal body content
 * @param {string} maxWidth - Tailwind max-width class (default 'max-w-lg')
 */
export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const sheetRef = useRef(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);

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
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset drag state when closing
  useEffect(() => {
    if (!isOpen) {
      setDragY(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  const handleTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - startYRef.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 100) {
      onClose?.();
    }
    setDragY(0);
  };

  if (!isOpen) return null;

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />

        {/* Bottom sheet */}
        <div
          ref={sheetRef}
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
          style={{
            transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 dark:border-white/[0.06]">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {title}
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="px-5 py-5 pb-8">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Desktop: centered modal
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
          {onClose && (
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
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
