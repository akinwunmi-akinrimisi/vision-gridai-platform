import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Code2, FlaskConical, Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { testPrompt } from '../../lib/settingsApi';

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
 * e.g., "script_pass1" -> "Script Pass 1"
 */
function formatTypeName(type) {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * TestPromptModal — modal for testing a prompt with sample input.
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl animate-in bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-2xl shadow-black/[0.08] dark:shadow-black/[0.3]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 dark:border-white/[0.06]">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Test: {formatTypeName(prompt.prompt_type)}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Read-only prompt preview */}
          <div>
            <label className="block text-xs font-medium text-text-muted dark:text-text-muted-dark mb-1.5 uppercase tracking-wider">Prompt Preview</label>
            <div className="max-h-32 overflow-y-auto rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-border/50 dark:border-white/[0.06] px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-400 scrollbar-thin">
              {prompt.prompt_text?.slice(0, 500)}{prompt.prompt_text?.length > 500 ? '...' : ''}
            </div>
          </div>

          {/* Test input */}
          <div>
            <label className="block text-xs font-medium text-text-muted dark:text-text-muted-dark mb-1.5 uppercase tracking-wider">Test Input</label>
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              rows={4}
              placeholder="Enter test input data..."
              className="input text-sm resize-none font-mono"
              disabled={isRunning}
            />
          </div>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={!testInput.trim() || isRunning}
            className="btn-primary btn-sm"
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
          </button>

          {/* Response */}
          {response && (
            <div>
              <label className="block text-xs font-medium text-text-muted dark:text-text-muted-dark mb-1.5 uppercase tracking-wider">Response</label>
              <div className="max-h-60 overflow-y-auto rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-border/50 dark:border-white/[0.06] px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap scrollbar-thin">
                {response}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
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

  // Reset edit text when prompt changes
  useEffect(() => {
    setEditText(prompt.prompt_text);
    setViewingVersion(null);
  }, [prompt.prompt_text]);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    }
  }, []);

  useEffect(() => {
    if (isExpanded) {
      // Small delay so DOM is ready
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
    // Show dropdown immediately, load data in background
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

  const handleSave = () => {
    if (onSave) {
      onSave(prompt.id, editText);
    }
  };

  const handleCancel = () => {
    setEditText(prompt.prompt_text);
    setViewingVersion(null);
  };

  const firstLine = prompt.prompt_text
    ? prompt.prompt_text.split('\n')[0].slice(0, 60) + (prompt.prompt_text.length > 60 ? '...' : '')
    : 'Empty prompt';

  return (
    <div data-testid="prompt-card" className="glass-card overflow-hidden">
      {/* Header - always visible */}
      <div
        data-testid="prompt-card-header"
        onClick={() => setIsExpanded(!isExpanded)}
        title={firstLine}
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-muted dark:text-text-muted-dark shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-muted dark:text-text-muted-dark shrink-0" />
          )}
          <span className="font-medium text-sm text-slate-900 dark:text-white">
            {formatTypeName(prompt.prompt_type)}
          </span>
          <button
            data-testid="version-badge"
            onClick={loadVersions}
            className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors relative"
          >
            v{prompt.version}
          </button>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setShowTestModal(true); }}
          className="btn-ghost btn-sm text-xs"
          title="Test this prompt"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          Test
        </button>
      </div>

      {/* Version dropdown */}
      {showVersions && (
        <div data-testid="version-dropdown" className="mx-4 mb-2 border border-border/50 dark:border-white/[0.06] rounded-lg bg-white dark:bg-slate-800 shadow-lg max-h-48 overflow-y-auto">
          {versions.map((ver) => (
            <button
              key={ver.version}
              onClick={() => handleVersionClick(ver)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors flex items-center justify-between ${
                ver.version === prompt.version ? 'font-semibold text-primary' : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>v{ver.version}</span>
              <span className="text-xs text-text-muted dark:text-text-muted-dark">
                {new Date(ver.created_at).toLocaleDateString()}
              </span>
            </button>
          ))}
          {versions.length === 0 && (
            <div className="px-3 py-2 text-sm text-text-muted dark:text-text-muted-dark">No versions found</div>
          )}
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Viewing old version banner */}
          {viewingVersion && (
            <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg px-3 py-2">
              <span className="text-xs text-amber-800 dark:text-amber-300">
                Viewing v{viewingVersion.version} (read-only)
              </span>
              <button
                onClick={handleRevert}
                className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
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
              bg-slate-50 dark:bg-white/[0.04] border border-border/50 dark:border-white/[0.06]
              rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30
              text-slate-800 dark:text-slate-200
              ${viewingVersion ? 'opacity-75 cursor-not-allowed' : ''}
            `}
            style={{ minHeight: '120px' }}
          />

          {/* Char / word count */}
          <div className="text-xs text-text-muted dark:text-text-muted-dark">
            {charCount} characters / {wordCount} words
          </div>

          {/* Save / Cancel buttons */}
          {hasChanges && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Variable reference */}
          {variables.length > 0 && (
            <div>
              <button
                onClick={() => setShowVariables(!showVariables)}
                className="flex items-center gap-1.5 text-xs text-text-muted dark:text-text-muted-dark hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <Code2 className="w-3.5 h-3.5" />
                {showVariables ? 'Hide variables' : 'Show variables'}
              </button>
              {showVariables && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {variables.map((v) => (
                    <span
                      key={v}
                      className="bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 rounded font-mono text-xs text-slate-600 dark:text-slate-400"
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
    </div>
  );
}
