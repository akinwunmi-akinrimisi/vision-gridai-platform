import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePromptConfigs, usePromptMutations } from '../../hooks/usePromptConfigs';
import PromptCard from './PromptCard';
import ConfirmDialog from '../ui/ConfirmDialog';

const PROMPT_GROUPS = [
  { label: 'Core', types: ['system_prompt', 'topic_generator'] },
  { label: 'Script Pipeline', types: ['script_pass1', 'script_pass2', 'script_pass3'] },
  { label: 'Evaluation', types: ['evaluator', 'visual_director'] },
];

/**
 * Prompts tab for Settings page.
 * Renders 7 prompt cards grouped into 3 categories with a Regenerate All button.
 */
export default function PromptsTab({ projectId }) {
  const { data: prompts, isLoading, error } = usePromptConfigs(projectId);
  const { updatePrompt, revertPrompt, regenerateAll } = usePromptMutations(projectId);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  const handleSave = (promptId, promptText) => {
    updatePrompt.mutate({ promptId, promptText });
  };

  const handleRevert = (promptId, version) => {
    revertPrompt.mutate({ promptId, version });
  };

  const handleRegenerateAll = () => {
    regenerateAll.mutate();
    setShowRegenConfirm(false);
  };

  if (isLoading) {
    return (
      <div data-testid="prompts-tab" className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="prompts-tab" className="glass-card p-6 text-center text-red-500">
        Failed to load prompts: {error.message}
      </div>
    );
  }

  // Index prompts by type for fast lookup
  const promptsByType = {};
  (prompts || []).forEach((p) => {
    promptsByType[p.prompt_type] = p;
  });

  return (
    <div data-testid="prompts-tab" className="space-y-6">
      {/* Header with Regenerate All button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Prompts</h2>
        <button
          onClick={() => setShowRegenConfirm(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-border/50 dark:border-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Regenerate All
        </button>
      </div>

      {/* Prompt groups */}
      {PROMPT_GROUPS.map((group) => (
        <div key={group.label} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted dark:text-text-muted-dark px-1">
            {group.label}
          </h3>
          {group.types.map((type) => {
            const prompt = promptsByType[type];
            if (!prompt) {
              return (
                <div
                  key={type}
                  data-testid="prompt-card"
                  className="glass-card px-4 py-3 opacity-50"
                >
                  <span className="text-sm text-text-muted dark:text-text-muted-dark">
                    {type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} -- Not generated yet
                  </span>
                </div>
              );
            }
            return (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                projectId={projectId}
                onSave={handleSave}
                onRevert={handleRevert}
              />
            );
          })}
        </div>
      ))}

      {/* Regenerate All Confirmation */}
      <ConfirmDialog
        isOpen={showRegenConfirm}
        onClose={() => setShowRegenConfirm(false)}
        onConfirm={handleRegenerateAll}
        title="Regenerate All Prompts?"
        message="This will use Claude to regenerate all 7 prompts for this project based on its niche profile. All custom edits will be preserved as previous versions in the version history."
        confirmText="Regenerate All"
        confirmVariant="danger"
        loading={regenerateAll.isPending}
      />
    </div>
  );
}
