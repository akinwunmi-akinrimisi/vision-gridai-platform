import { useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Minimal markdown renderer (same pattern as IntelligenceHub)        */
/* ------------------------------------------------------------------ */

function renderInline(text) {
  if (!text) return null;
  // **bold** and *italic* and `inline code`
  const parts = [];
  let remaining = text;
  let key = 0;
  // We do sequential replacement of tokens by scanning
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/;
  while (remaining.length > 0) {
    const m = remaining.match(regex);
    if (!m) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
    const idx = m.index ?? 0;
    if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
    const token = m[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={key++} className="font-semibold text-foreground">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      parts.push(<code key={key++} className="px-1 py-0.5 rounded bg-muted text-[11px] font-mono">{token.slice(1, -1)}</code>);
    } else if (token.startsWith('*')) {
      parts.push(<em key={key++} className="italic">{token.slice(1, -1)}</em>);
    }
    remaining = remaining.slice(idx + token.length);
  }
  return parts;
}

function renderMarkdown(text) {
  if (!text || typeof text !== 'string') return null;
  const blocks = text.split(/\n\s*\n/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('### ')) {
      return <h4 key={i} className="text-sm font-semibold mt-3 mb-1.5 text-foreground">{renderInline(trimmed.slice(4))}</h4>;
    }
    if (trimmed.startsWith('## ')) {
      return <h3 key={i} className="text-[15px] font-bold mt-4 mb-2 text-foreground">{renderInline(trimmed.slice(3))}</h3>;
    }
    if (trimmed.startsWith('# ')) {
      return <h2 key={i} className="text-base font-bold mt-4 mb-2 text-foreground">{renderInline(trimmed.slice(2))}</h2>;
    }
    if (/^[-*]\s/.test(trimmed)) {
      const items = trimmed.split('\n').map((l) => l.replace(/^[-*]\s+/, '')).filter(Boolean);
      return (
        <ul key={i} className="list-disc list-inside space-y-1 my-2 text-sm leading-relaxed">
          {items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
        </ul>
      );
    }
    if (/^\d+\.\s/.test(trimmed)) {
      const items = trimmed.split('\n').map((l) => l.replace(/^\d+\.\s+/, '')).filter(Boolean);
      return (
        <ol key={i} className="list-decimal list-inside space-y-1 my-2 text-sm leading-relaxed">
          {items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
        </ol>
      );
    }
    // Code block
    if (trimmed.startsWith('```')) {
      const body = trimmed.replace(/^```[\w-]*\n?/, '').replace(/```$/, '');
      return (
        <pre key={i} className="my-2 p-3 rounded-md bg-muted text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
          {body}
        </pre>
      );
    }
    return (
      <p key={i} className="text-sm leading-relaxed my-2">
        {renderInline(trimmed)}
      </p>
    );
  });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTokens(tokens) {
  if (tokens == null) return null;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return String(tokens);
}

/* ------------------------------------------------------------------ */
/*  MessageBubble                                                      */
/* ------------------------------------------------------------------ */

export default function MessageBubble({ message, onShowContext }) {
  const [hovered, setHovered] = useState(false);
  const role = message.role;
  const isUser = role === 'user';
  const isSystem = role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center px-4 py-2 animate-fade-in">
        <span className="text-[11px] text-muted-foreground italic">
          {message.content}
        </span>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-2 animate-fade-in">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-accent/15 border border-accent/30 text-foreground">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  // assistant
  return (
    <div
      className="flex justify-start px-4 py-2 animate-fade-in"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="max-w-[85%] min-w-0">
        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card border border-border text-foreground">
          <div className="coach-markdown text-muted-foreground">
            {renderMarkdown(message.content)}
          </div>
        </div>
        {/* Footer: turn, tokens, cost, show context */}
        <div
          className={cn(
            'flex items-center gap-3 px-2 mt-1 text-[10px] text-muted-foreground transition-opacity',
            hovered ? 'opacity-100' : 'opacity-60',
          )}
        >
          <span className="font-mono tabular-nums">
            turn {message.turn_index}
          </span>
          {message.input_tokens != null && (
            <span className="font-mono tabular-nums">
              {formatTokens(message.input_tokens)} in
            </span>
          )}
          {message.output_tokens != null && (
            <span className="font-mono tabular-nums">
              {formatTokens(message.output_tokens)} out
            </span>
          )}
          {message.cost_usd != null && (
            <span className="font-mono tabular-nums">
              ${message.cost_usd.toFixed(4)}
            </span>
          )}
          {message.context_snapshot && (
            <button
              onClick={() => onShowContext?.(message)}
              className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer transition-colors"
            >
              <Info className="w-2.5 h-2.5" />
              Show context
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
