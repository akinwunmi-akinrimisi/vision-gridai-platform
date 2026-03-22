import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '../ui/Modal';
import { useCreateProject } from '../../hooks/useProjects';

const EXAMPLE_HINTS = [
  'e.g., US Credit Cards',
  'e.g., Stoic Philosophy',
  'e.g., True Crime',
  'e.g., Personal Finance',
  'e.g., Space Exploration',
];

export default function CreateProjectModal({ isOpen, onClose }) {
  const [niche, setNiche] = useState('');
  const [description, setDescription] = useState('');
  const [targetVideoCount, setTargetVideoCount] = useState(25);
  const [hintIndex, setHintIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef(null);

  const [nicheBlurred, setNicheBlurred] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const createProject = useCreateProject();

  // Cycle placeholder hints every 3 seconds
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % EXAMPLE_HINTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setNiche('');
      setDescription('');
      setTargetVideoCount(25);
      setShowSuccess(false);
      setNicheBlurred(false);
      setSubmitAttempted(false);
    }
  }, [isOpen]);

  const nicheError = (nicheBlurred || submitAttempted) && niche.trim().length < 3
    ? 'Niche name must be at least 3 characters'
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!niche.trim() || niche.trim().length < 3) return;

    try {
      await createProject.mutateAsync({
        niche: niche.trim(),
        description: description.trim() || undefined,
        target_video_count: targetVideoCount,
      });

      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      toast.error(err?.message || 'Failed to create project. Please try again.');
    }
  };

  const isSubmitting = createProject.isPending;
  const isValid = niche.trim().length >= 3;

  return (
    <Modal isOpen={isOpen} onClose={isSubmitting || showSuccess ? undefined : onClose} title="New Project">
      {showSuccess ? (
        <div className="flex flex-col items-center justify-center py-8" data-testid="success-state">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4 animate-in">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">Project created!</p>
          <p className="text-sm text-text-muted dark:text-text-muted-dark mt-1">
            Research is starting automatically...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Niche name */}
          <div>
            <label
              htmlFor="niche-name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Niche Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={inputRef}
              id="niche-name"
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              onBlur={() => setNicheBlurred(true)}
              disabled={isSubmitting}
              placeholder={EXAMPLE_HINTS[hintIndex]}
              className={`
                w-full px-4 py-2.5 rounded-xl text-sm
                bg-white dark:bg-slate-800
                border ${nicheError ? 'border-red-400 dark:border-red-500' : 'border-border dark:border-slate-700'}
                text-slate-900 dark:text-white
                placeholder:text-slate-400 dark:placeholder:text-slate-500
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
              `}
            />
            {nicheError && (
              <p className="text-red-400 text-sm mt-1">{nicheError}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="niche-description"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Description <span className="text-xs text-text-muted dark:text-text-muted-dark">(optional)</span>
            </label>
            <textarea
              id="niche-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              placeholder="Brief description of the niche and target audience..."
              className="
                w-full px-4 py-2.5 rounded-xl text-sm resize-none
                bg-white dark:bg-slate-800
                border border-border dark:border-slate-700
                text-slate-900 dark:text-white
                placeholder:text-slate-400 dark:placeholder:text-slate-500
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
              "
            />
          </div>

          {/* Target video count */}
          <div>
            <label
              htmlFor="target-video-count"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Target Videos
            </label>
            <input
              id="target-video-count"
              type="number"
              min={1}
              max={100}
              value={targetVideoCount}
              onChange={(e) => setTargetVideoCount(parseInt(e.target.value, 10) || 25)}
              disabled={isSubmitting}
              className="
                w-full px-4 py-2.5 rounded-xl text-sm
                bg-white dark:bg-slate-800
                border border-border dark:border-slate-700
                text-slate-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
              "
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="
                px-4 py-2.5 rounded-xl text-sm font-medium
                text-slate-600 dark:text-slate-400
                hover:bg-slate-100 dark:hover:bg-white/[0.06]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200 cursor-pointer
              "
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="
                inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white
                bg-gradient-to-r from-primary to-indigo-600
                shadow-md shadow-primary/20
                hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md
                transition-all duration-200 cursor-pointer
              "
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
