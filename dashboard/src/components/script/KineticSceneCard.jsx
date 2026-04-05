/**
 * KineticSceneCard — Individual scene card for kinetic typography scripts.
 * Shows scene type badge, duration, element list with animation previews.
 *
 * TODO: Implement in Phase 8.5 (Prompt 8.5.3)
 */
export default function KineticSceneCard({ scene, index }) {
  return (
    <div className="border border-border rounded-lg p-3 mb-2">
      <p className="text-xs text-muted-foreground">Scene {index + 1} — {scene?.scene_type || 'unknown'}</p>
    </div>
  );
}
