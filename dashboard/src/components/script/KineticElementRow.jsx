/**
 * KineticElementRow — Individual element within a kinetic scene.
 * Shows text, style badge, animation type, timing (delay + duration).
 *
 * TODO: Implement in Phase 8.5 (Prompt 8.5.3)
 */
export default function KineticElementRow({ element, index }) {
  return (
    <div className="flex items-center gap-2 py-1 text-xs">
      <span className="text-muted-foreground w-4">{index + 1}</span>
      <span className="flex-1 truncate">{element?.text || ''}</span>
      <span className="text-[10px] text-muted-foreground">{element?.animation || ''}</span>
    </div>
  );
}
