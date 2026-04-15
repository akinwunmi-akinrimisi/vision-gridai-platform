import { useRef, useState, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function MessageInput({
  value,
  onChange,
  onSend,
  isPending,
  disabled,
  placeholder = 'Ask anything about your project...',
}) {
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, 180);
    el.style.height = `${next}px`;
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isPending && value.trim() && !disabled) {
        onSend();
      }
    }
  };

  return (
    <div className="p-3 border-t border-border bg-card/70 backdrop-blur-sm">
      {isPending && (
        <div className="flex items-center gap-2 px-2 pb-2 text-xs text-muted-foreground animate-fade-in">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Coach is thinking...
        </div>
      )}
      <div
        className={cn(
          'flex items-end gap-2 p-2 rounded-xl border transition-colors',
          disabled
            ? 'bg-muted/40 border-border opacity-60'
            : 'bg-muted border-border focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/40',
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isPending || disabled}
          rows={1}
          className="flex-1 bg-transparent border-0 outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground min-h-[24px] max-h-[180px] py-1.5 px-1"
        />
        <Button
          size="sm"
          onClick={onSend}
          disabled={isPending || disabled || !value.trim()}
          className="flex-shrink-0"
        >
          {isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          Send
        </Button>
      </div>
      <div className="mt-1.5 px-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[9px]">Enter</kbd>
          {' '}to send, {' '}
          <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[9px]">Shift+Enter</kbd>
          {' '}for newline
        </span>
      </div>
    </div>
  );
}
