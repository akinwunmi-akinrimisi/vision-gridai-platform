import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Code2, FlaskConical, Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { testPrompt } from '../../lib/settingsApi';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

/**
 * Variable reference map per prompt type.
 */
const PROMPT_VARIABLES = {
  system_prompt: ['{{niche}}', '{{niche_description}}', '{{niche_expertise_profile}}', '{{channel_style}}', '{{blue_ocean_strategy}}'],
  topic_generator: ['{{niche}}', '{{niche_expertise_profile}}', '{{target_video_count}}', '{{playlist1_name}}', '{{playlist1_theme}}', '{{playlist2_name}}', '{{playlist2_theme}}', '{{playlist3_name}}', '{{playlist3_theme}}', '{{red_ocean_topics}}', '{{competitor_channels}}'],
  script_pass1: ['{{seo_title}}', '{{narrative_hook}}', '{{key_segments}}', '{{avatar_name_age}}', '{{occupation_income}}', '{{pain_point}}', '{{emotional_driver}}', '{{dream_outcome}}', '{{niche_expertise_profile}}'],
  script_pass2: ['{{seo_title}}', '{{pass1_output}}', '{{key_segments}}', '{{content_angle_blue_ocean}}'],
  script_pass3: ['{{seo_title}}', '{{pass1_summary}}', '{{pass2_summary}}', '{{dream_outcome}}', '{{practical_takeaways}}'],
  evaluator: ['{{combined_script}}', '{{word_count}}', '{{scene_count}}'],
  visual_director: ['{{scene_narration}}', '{{emotional_beat}}', '{{chapter}}'],
  shorts_analyzer: ['{{seo_title}}', '{{script_json}}', '{{scene_count}}', '{{word_count}}', '{{niche}}', '{{avatar_name_age}}', '{{pain_point}}'],
};

/**
 * Format prompt type key to display name.
 */
function formatTypeName(type) {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * TestPromptModal -- shadcn Dialog for testing a prompt with sample input.
 */
function TestPromptModal({ prompt, isOpen, onClose }) {
  const [testInput, setTestInput] = useState('');
  const [response, setResponse] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTestInput('');
      setResponse('');
      setIsRunning(false);
    }
  }, [isOpen]);

  const handleRun = async () => {
    if (!testInput.trim()) return;
    setIsRunning(true);
    setResponse('');
    try {
      const result = await testPrompt(prompt.id, testInput.trim());
      if (result?.success === false) {
        setResponse(`Error: ${result.error || 'Unknown error'}`);
      } else {
        setResponse(typeof result?.data === 'string' ? result.data : JSON.stringify(result?.data || result, null, 2));
      }
    } catch (err) {
      setResponse(`Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Test: {formatTypeName(prompt.prompt_type)}</DialogTitle>
          <DialogDescription className="sr-only">
            Test prompt with sample input
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Read-only prompt preview */}
          <div>
            <label className="block text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Prompt Preview</label>
            <div className="max-h-32 overflow-y-auto rounded-md bg-muted border border-border px-3 py-2 font-mono text-xs text-muted-foreground">
              {prompt.prompt_text?.slice(0, 500)}{prompt.prompt_text?.length > 500 ? '...' : ''}
            </div>
          </div>

          {/* Test input */}
          <div>
            <label className="block text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Test Input</label>
            <Textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              rows={4}
              placeholder="Enter test input data..."
              className="text-sm resize-none font-mono"
              disabled={isRunning}
            />
          </div>

          {/* Run button */}
          <Button
            size="sm"
            onClick={handleRun}
            disabled={!testInput.trim() || isRunning}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <FlaskConical className="w-3.5 h-3.5" />
                Run Test
              </>
            )}
          </Button>

          {/* Response */}
          {response && (
            <div>
              <label className="block text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Response</label>
              <div className="max-h-60 overflow-y-auto rounded-md bg-muted border border-border px-3 py-2 font-mono text-xs whitespace-pre-wrap">
                {response}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Individual prompt card with expand/collapse, inline editing,
 * version history dropdown, variable reference, and test button.
 */
export default function PromptCard({ prompt, projectId, onSave, onRevert }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editText, setEditText] = useState(prompt.prompt_text);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState([]);
  const [viewingVersion, setViewingVersion] = useState(null);
  const [showVariables, setShowVariables] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    setEditText(prompt.prompt_text);
    setViewingVersion(null);
  }, [prompt.prompt_text]);

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    }
  }, []);

  useEffect(() => {
    if (isExpanded) {
      setTimeout(autoResize, 0);
    }
  }, [isExpanded, editText, viewingVersion, autoResize]);

  const hasChanges = editText !== prompt.prompt_text && !viewingVersion;
  const charCount = (viewingVersion ? viewingVersion.prompt_text : editText).length;
  const wordCount = (viewingVersion ? viewingVersion.prompt_text : editText)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const variables = PROMPT_VARIABLES[prompt.prompt_type] || [];

  const loadVersions = (e) => {
    e.stopPropagation();
    if (showVersions) {
      setShowVersions(false);
      return;
    }
    setShowVersions(true);
    supabase
      .from('prompt_configs')
      .select('id, version, prompt_text, created_at')
      .eq('project_id', projectId)
      .eq('prompt_type', prompt.prompt_type)
      .order('version', { ascending: false })
      .then(({ data }) => {
        setVersions(data || []);
      });
  };

  const handleVersionClick = (ver) => {
    setViewingVersion(ver);
    setShowVersions(false);
  };

  const handleRevert = () => {
    if (viewingVersion && onRevert) {
      onRevert(prompt.id, viewingVersion.version);
      setViewingVersion(null);
    }
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleSaveClicked = () => {
    if (prompt.requires_compliance_role) {
      setConfirmText('');
      setConfirmOpen(true);
      return;
    }
    if (onSave) onSave(prompt.id, editText);
  };

  const handleConfirmSave = () => {
    if (confirmText !== 'CONFIRM') return;
    if (onSave) onSave(prompt.id, editText);
    setConfirmOpen(false);
    setConfirmText('');
  };

  // Backwards-compat: existing call sites pass handleSave
  const handleSave = handleSaveClicked;

  const handleCancel = () => {
    setEditText(prompt.prompt_text);
    setViewingVersion(null);
  };

  const firstLine = prompt.prompt_text
    ? prompt.prompt_text.split('\n')[0].slice(0, 60) + (prompt.prompt_text.length > 60 ? '...' : '')
    : 'Empty prompt';

  return (
    <div data-testid="prompt-card" className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header -- always visible */}
      <div
        data-testid="prompt-card-header"
        onClick={() => setIsExpanded(!isExpanded)}
        title={firstLine}
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <span className="font-medium text-sm">
            {formatTypeName(prompt.prompt_type)}
          </span>
          <button
            data-testid="version-badge"
            onClick={loadVersions}
            className="px-2 py-0.5 text-[10px] font-medium rounded-sm bg-primary/10 text-primary hover:bg-primary/20 transition-colors relative"
          >
            v{prompt.version}
          </button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={(e) => { e.stopPropagation(); setShowTestModal(true); }}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          Test
        </Button>
      </div>

      {/* Version dropdown */}
      {showVersions && (
        <div data-testid="version-dropdown" className="mx-4 mb-2 border border-border rounded-md bg-background shadow-lg max-h-48 overflow-y-auto">
          {versions.map((ver) => (
            <button
              key={ver.version}
              onClick={() => handleVersionClick(ver)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center justify-between ${
                ver.version === prompt.version ? 'font-semibold text-primary' : 'text-foreground'
              }`}
            >
              <span>v{ver.version}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(ver.created_at).toLocaleDateString()}
              </span>
            </button>
          ))}
          {versions.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No versions found</div>
          )}
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Viewing old version banner */}
          {viewingVersion && (
            <div className="flex items-center justify-between bg-warning-bg border border-warning-border rounded-md px-3 py-2">
              <span className="text-xs text-warning">
                Viewing v{viewingVersion.version} (read-only)
              </span>
              <button
                onClick={handleRevert}
                className="text-xs font-medium text-warning hover:underline"
              >
                Revert to this version
              </button>
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={viewingVersion ? viewingVersion.prompt_text : editText}
            onChange={(e) => {
              setEditText(e.target.value);
            }}
            onInput={autoResize}
            readOnly={!!viewingVersion}
            className={`
              w-full font-mono text-sm leading-relaxed resize-none overflow-hidden
              bg-muted border border-border
              rounded-md px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring
              ${viewingVersion ? 'opacity-75 cursor-not-allowed' : ''}
            `}
            style={{ minHeight: '120px' }}
          />

          {/* Char / word count */}
          <div className="text-xs text-muted-foreground">
            {charCount} characters / {wordCount} words
          </div>

          {/* Save / Cancel buttons */}
          {hasChanges && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave}>Save</Button>
              <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
            </div>
          )}

          {/* Variable reference */}
          {variables.length > 0 && (
            <div>
              <button
                onClick={() => setShowVariables(!showVariables)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Code2 className="w-3.5 h-3.5" />
                {showVariables ? 'Hide variables' : 'Show variables'}
              </button>
              {showVariables && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {variables.map((v) => (
                    <span
                      key={v}
                      className="bg-muted px-2 py-0.5 rounded-sm font-mono text-[10px] text-muted-foreground border border-border"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Test modal */}
      <TestPromptModal
        prompt={prompt}
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
      />

      {/* Compliance-gated save confirmation
          Triggered when prompt_templates.requires_compliance_role = true.
          Forces operator to type CONFIRM before saving — soft gate, not a
          role system. AU disclaimer rows (AD-01, AD-02, AD-04) carry this
          flag per migration 032.
      */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compliance-sensitive prompt</DialogTitle>
            <DialogDescription>
              This prompt is flagged as compliance-sensitive (e.g., a verbatim
              regulatory disclaimer). Editing it changes the legal protection
              posture for any video using it.
              <br /><br />
              Type <strong className="font-mono">CONFIRM</strong> to save.
            </DialogDescription>
          </DialogHeader>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type CONFIRM"
            autoFocus
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm font-mono"
          />
          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setConfirmOpen(false); setConfirmText(''); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={confirmText !== 'CONFIRM'}
              onClick={handleConfirmSave}
            >
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
