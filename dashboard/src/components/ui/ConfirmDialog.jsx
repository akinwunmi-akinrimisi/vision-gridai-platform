import Modal from './Modal';

/**
 * Centered confirmation modal dialog (built on Modal).
 * @param {boolean} isOpen - Whether dialog is visible
 * @param {Function} onClose - Close/cancel handler
 * @param {Function} onConfirm - Confirm action handler
 * @param {string} title - Dialog title
 * @param {string|React.ReactNode} message - Dialog message body
 * @param {string} confirmText - Confirm button label (default 'Confirm')
 * @param {'danger'|'primary'} confirmVariant - Button style variant
 * @param {boolean} loading - Whether confirm action is in progress
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  confirmVariant = 'primary',
  loading = false,
  children,
}) {
  const variantStyles = {
    primary:
      'bg-gradient-to-r from-primary to-indigo-600 text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30',
    danger:
      'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30',
    success:
      'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-5">
        <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {message}
          {children}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="
              px-4 py-2.5 rounded-xl text-sm font-medium
              text-slate-600 dark:text-slate-300
              bg-slate-100 dark:bg-white/[0.06]
              hover:bg-slate-200 dark:hover:bg-white/[0.1]
              border border-border/50 dark:border-white/[0.06]
              transition-all duration-200 cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`
              px-4 py-2.5 rounded-xl text-sm font-semibold
              transition-all duration-200 cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed
              ${variantStyles[confirmVariant] || variantStyles.primary}
            `}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
