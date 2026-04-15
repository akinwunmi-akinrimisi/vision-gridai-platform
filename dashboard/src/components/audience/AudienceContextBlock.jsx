import { useState } from 'react';
import { FileCode, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AudienceContextBlock({ text }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasText = typeof text === 'string' && text.trim().length > 0;

  const handleCopy = async () => {
    if (!hasText) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Audience context copied');
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Clipboard unavailable');
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-card-hover transition-colors cursor-pointer text-left"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <FileCode className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold">
          <code className="px-1 py-0.5 rounded bg-muted text-[11px] font-mono">{'{{audience_context}}'}</code>
          <span className="ml-2">Pass 1 Injection Preview</span>
        </h3>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
          {hasText ? `${text.length} chars` : 'empty'}
        </span>
      </button>

      {open && (
        <div className="border-t border-border animate-fade-in">
          <div className="flex items-center justify-between gap-2 px-4 py-2 bg-muted/40 border-b border-border">
            <p className="text-[11px] text-muted-foreground">
              Automatically injected into Pass 1 of future script generation for this project via the{' '}
              <code className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">{'{{audience_context}}'}</code> template variable.
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              disabled={!hasText}
              className="h-7 flex-shrink-0"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-success" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <pre
            className={cn(
              'whitespace-pre-wrap break-words text-[12px] leading-relaxed font-mono text-foreground/90',
              'px-4 py-3 max-h-[360px] overflow-y-auto',
              !hasText && 'text-muted-foreground italic font-sans',
            )}
          >
            {hasText ? text : 'No audience context block synthesized yet. It will be generated on the next weekly run.'}
          </pre>
        </div>
      )}
    </div>
  );
}
