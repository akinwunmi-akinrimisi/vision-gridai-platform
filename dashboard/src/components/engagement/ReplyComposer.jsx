import { useState, useCallback } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/**
 * Inline reply composer shown within a comment card.
 * Includes a textarea, an AI-suggest button (stub), and a send button.
 *
 * @param {{ onSend: (text: string) => void, isSending: boolean, onCancel: () => void }} props
 */
export default function ReplyComposer({ onSend, isSending = false, onCancel }) {
  const [replyText, setReplyText] = useState('');
  const [suggesting, setSuggesting] = useState(false);

  const handleSend = useCallback(() => {
    const trimmed = replyText.trim();
    if (!trimmed) return;
    onSend(trimmed);
  }, [replyText, onSend]);

  const handleAiSuggest = useCallback(async () => {
    setSuggesting(true);
    // Stub: in production this would call an n8n webhook or Claude API
    // to generate a reply suggestion based on the comment text.
    await new Promise((r) => setTimeout(r, 800));
    setReplyText(
      'Thank you for watching and for your thoughtful comment! We appreciate your engagement and will address this in an upcoming video.'
    );
    setSuggesting(false);
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="mt-3 space-y-2">
      <Textarea
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a reply..."
        className="min-h-[60px] text-sm resize-none"
        disabled={isSending}
      />
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAiSuggest}
          disabled={suggesting || isSending}
          className="text-xs gap-1.5"
        >
          {suggesting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          AI Suggest
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSending} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!replyText.trim() || isSending}
            className="text-xs gap-1.5"
          >
            {isSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Send Reply
          </Button>
        </div>
      </div>
    </div>
  );
}
