import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useCreateProject } from '../../hooks/useProjects';

const EXAMPLE_HINTS = [
  'e.g., US Credit Cards',
  'e.g., Stoic Philosophy',
  'e.g., True Crime',
  'e.g., Personal Finance',
  'e.g., Space Exploration',
];

export default function CreateProjectModal({ open, onOpenChange }) {
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
    if (!open) return;
    const interval = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % EXAMPLE_HINTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [open]);

  // Focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setNiche('');
      setDescription('');
      setTargetVideoCount(25);
      setShowSuccess(false);
      setNicheBlurred(false);
      setSubmitAttempted(false);
    }
  }, [open]);

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
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      toast.error(err?.message || 'Failed to create project. Please try again.');
    }
  };

  const isSubmitting = createProject.isPending;
  const isValid = niche.trim().length >= 3;

  return (
    <Dialog
      open={open}
      onOpenChange={isSubmitting || showSuccess ? undefined : onOpenChange}
    >
      <DialogContent className="sm:max-w-md border-border">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Enter a niche to start researching. The system will analyze competitors, audience, and opportunities.
          </DialogDescription>
        </DialogHeader>

        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-8" data-testid="success-state">
            <div className="w-16 h-16 rounded-full bg-success-bg flex items-center justify-center mb-4 animate-fade-in">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <p className="text-base font-semibold">Project created!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Research is starting automatically...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Niche name */}
            <div className="space-y-1.5">
              <label
                htmlFor="niche-name"
                className="block text-sm font-medium"
              >
                Niche Name <span className="text-danger">*</span>
              </label>
              <Input
                ref={inputRef}
                id="niche-name"
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                onBlur={() => setNicheBlurred(true)}
                disabled={isSubmitting}
                placeholder={EXAMPLE_HINTS[hintIndex]}
                className={nicheError ? 'border-danger focus-visible:ring-danger' : ''}
              />
              {nicheError && (
                <p className="text-danger text-xs mt-1">{nicheError}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label
                htmlFor="niche-description"
                className="block text-sm font-medium"
              >
                Description{' '}
                <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="niche-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                placeholder="Brief description of the niche and target audience..."
              />
            </div>

            {/* Target video count */}
            <div className="space-y-1.5">
              <label
                htmlFor="target-video-count"
                className="block text-sm font-medium"
              >
                Target Videos
              </label>
              <Input
                id="target-video-count"
                type="number"
                min={1}
                max={100}
                value={targetVideoCount}
                onChange={(e) => setTargetVideoCount(parseInt(e.target.value, 10) || 25)}
                disabled={isSubmitting}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isValid}
                className="bg-gradient-to-r from-primary to-destructive hover:from-primary-hover hover:to-destructive/90 text-white shadow-glow-primary"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Start Research'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
