/**
 * KineticProductionMonitor — Production progress for Kinetic Typography projects.
 * Different pipeline from AI Cinematic: Script → Frames → TTS → Mix → Assembly → Upload.
 * Shows current chapter/scene, frame progress bar, per-chapter progress.
 * Subscribes to Supabase Realtime on kinetic_scenes and kinetic_jobs tables.
 *
 * TODO: Implement in Phase 8.5 (Prompt 8.5.4)
 */
export default function KineticProductionMonitor({ topicId, projectId }) {
  return (
    <div className="p-8 text-center text-muted-foreground">
      <p className="text-sm">Kinetic Typography Production Monitor</p>
      <p className="text-xs mt-1">Coming in Phase 8.5</p>
    </div>
  );
}
