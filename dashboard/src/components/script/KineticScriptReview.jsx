/**
 * KineticScriptReview — Script review for Kinetic Typography projects.
 * Shows element-level timeline with chapter accordion, scene cards, element rows.
 * Conditional render: only shown when project.production_style === 'kinetic_typography'.
 *
 * TODO: Implement in Phase 8.5 (Prompt 8.5.3)
 */
export default function KineticScriptReview({ topic, scenes, onApprove, onReject, onRefine }) {
  return (
    <div className="p-8 text-center text-muted-foreground">
      <p className="text-sm">Kinetic Typography Script Review</p>
      <p className="text-xs mt-1">Coming in Phase 8.5</p>
    </div>
  );
}
