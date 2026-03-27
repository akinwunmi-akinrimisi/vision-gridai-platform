import { useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { usePromptConfigs, usePromptMutations } from '../../hooks/usePromptConfigs';
import PromptCard from './PromptCard';
import ConfirmDialog from '../ui/ConfirmDialog';

import { Button } from '@/components/ui/button';

const PROMPT_GROUPS = [
  { label: 'Core', types: ['system_prompt', 'topic_generator'] },
  { label: 'Script Pipeline', types: ['script_pass1', 'script_pass2', 'script_pass3'] },
  { label: 'Evaluation', types: ['evaluator', 'visual_director'] },
  { label: 'Shorts', types: ['shorts_analyzer'] },
];

/**
 * Prompts tab for Settings page.
 * Renders prompt cards grouped into 4 categories with a Regenerate All button.
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
      <div data-testid="prompts-tab" className="bg-danger-bg border border-danger-border rounded-lg p-6 text-center">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-danger" />
        <p className="text-sm font-medium text-danger">Failed to load prompts</p>
        <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  // Index prompts by type for fast lookup
  const promptsByType = {};
  (prompts || []).forEach((p) => {
    promptsByType[p.prompt_type] = p;
  });

  return (
    <div data-testid="prompts-tab" className="space-y-6 max-w-2xl">
      {/* Header with Regenerate All button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Prompt Templates</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            AI-generated prompts for each pipeline stage
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRegenConfirm(true)}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Regenerate All
        </Button>
      </div>

      {/* Prompt groups */}
      {PROMPT_GROUPS.map((group) => (
        <div key={group.label} className="space-y-2">
          <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1">
            {group.label}
          </h4>
          {group.types.map((type) => {
            const prompt = promptsByType[type];
            if (!prompt) {
              return (
                <div
                  key={type}
                  data-testid="prompt-card"
                  className="bg-card border border-border rounded-lg px-4 py-3 opacity-50"
                >
                  <span className="text-sm text-muted-foreground">
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
