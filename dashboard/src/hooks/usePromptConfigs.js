/**
 * Hook for fetching and mutating prompt_configs for a project.
 * Stub — will be implemented in Phase 06 Plan 01.
 */

export function usePromptConfigs(projectId) {
  return {
    data: [],
    isLoading: true,
    error: null,
  };
}

export function usePromptMutations(projectId) {
  return {
    updatePrompt: { mutate: () => {}, isPending: false },
    revertPrompt: { mutate: () => {}, isPending: false },
    regenerateAll: { mutate: () => {}, isPending: false },
  };
}
