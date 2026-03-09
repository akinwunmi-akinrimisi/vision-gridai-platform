/**
 * Hook for fetching and updating per-project settings.
 * Stub — will be implemented in Phase 06 Plan 01.
 */

export function useProjectSettings(projectId) {
  return {
    data: null,
    isLoading: true,
    error: null,
  };
}

export function useUpdateSettings(projectId) {
  return {
    mutate: () => {},
    isPending: false,
    isSuccess: false,
    error: null,
  };
}
