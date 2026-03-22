import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Database, Youtube, Webhook, Shield, Palette, Pencil, Folder, Share2, AlertTriangle, Trash2, RotateCcw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useProjectSettings, useUpdateSettings } from '../../hooks/useProjectSettings';
import { supabase } from '../../lib/supabase';
import { resetAllTopics, clearProductionData, deleteProject } from '../../lib/settingsApi';

/* ------------------------------------------------------------------
 * Model options with costs
 * ----------------------------------------------------------------*/
const IMAGE_MODEL_OPTIONS = [
  { value: 'fal-ai/bytedance/seedream/v4/text-to-image', label: 'Seedream 4.0', cost: 0.03 },
  { value: 'fal-ai/flux/schnell', label: 'FLUX Schnell', cost: 0.003 },
  { value: 'fal-ai/flux-pro/v1.1', label: 'FLUX Pro 1.1', cost: 0.05 },
];

const I2V_MODEL_OPTIONS = [
  { value: 'fal-ai/wan-25-preview/image-to-video', label: 'Wan 2.5', cost: 0.05 },
  { value: 'fal-ai/kling-video/v2.1/standard/image-to-video', label: 'Kling 2.1', cost: 0.125 },
];

const T2V_MODEL_OPTIONS = [
  { value: 'fal-ai/wan-25-preview/text-to-video', label: 'Wan 2.5', cost: 0.05 },
  { value: 'fal-ai/kling-video/v2.1/standard/text-to-video', label: 'Kling 2.1', cost: 0.125 },
];

/* ------------------------------------------------------------------
 * Field definitions
 * ----------------------------------------------------------------*/
const projectInfoFields = [
  { key: 'name', label: 'Project Name', type: 'text' },
  { key: 'niche', label: 'Niche', type: 'text' },
  { key: 'niche_description', label: 'Niche Description', type: 'textarea' },
];

const productionFields = [
  { key: 'script_approach', label: 'Script Approach', type: 'select', options: [
    { value: '3_pass', label: '3-Pass' },
    { value: 'single_call', label: 'Single Call' },
  ]},
  { key: 'images_per_video', label: 'Images Per Video', type: 'number', min: 10, max: 200 },
  { key: 'i2v_clips_per_video', label: 'I2V Clips Per Video', type: 'number', min: 5, max: 100 },
  { key: 't2v_clips_per_video', label: 'T2V Clips Per Video', type: 'number', min: 10, max: 200 },
  { key: 'target_word_count', label: 'Target Word Count', type: 'number', min: 5000, max: 30000 },
  { key: 'target_scene_count', label: 'Target Scene Count', type: 'number', min: 50, max: 300 },
  { key: 'image_model', label: 'Image Model', type: 'model-select', modelOptions: IMAGE_MODEL_OPTIONS, costKey: 'image_cost' },
  { key: 'i2v_model', label: 'I2V Model', type: 'model-select', modelOptions: I2V_MODEL_OPTIONS, costKey: 'i2v_cost' },
  { key: 't2v_model', label: 'T2V Model', type: 'model-select', modelOptions: T2V_MODEL_OPTIONS, costKey: 't2v_cost' },
];

const youtubeFields = [
  { key: 'youtube_channel_id', label: 'Channel ID', type: 'text' },
  { key: 'youtube_playlist1_id', label: 'Playlist 1 ID', type: 'text' },
  { key: 'youtube_playlist2_id', label: 'Playlist 2 ID', type: 'text' },
  { key: 'youtube_playlist3_id', label: 'Playlist 3 ID', type: 'text' },
  { key: 'drive_root_folder_id', label: 'Drive Root Folder ID', type: 'text' },
  { key: 'drive_assets_folder_id', label: 'Drive Assets Folder ID', type: 'text' },
];

/* ------------------------------------------------------------------
 * Display value helper
 * ----------------------------------------------------------------*/
function displayValue(field, value) {
  if (value == null || value === '') return '--';
  if (field.type === 'select') {
    const opt = field.options?.find((o) => o.value === value);
    return opt ? opt.label : String(value);
  }
  if (field.type === 'model-select') {
    const opt = field.modelOptions?.find((o) => o.value === value);
    return opt ? `${opt.label} ($${opt.cost}/unit)` : String(value);
  }
  return String(value);
}

/* ------------------------------------------------------------------
 * Gradient color picker for sections
 * ----------------------------------------------------------------*/
function sectionGradient(title) {
  if (title === 'Project Info') return 'from-blue-500/20 to-indigo-500/20';
  if (title === 'Production Config') return 'from-primary/20 to-indigo-500/20';
  if (title === 'YouTube & Drive') return 'from-red-500/20 to-rose-500/20';
  if (title === 'API & Webhooks') return 'from-emerald-500/20 to-teal-500/20';
  if (title === 'Social Media Accounts') return 'from-pink-500/20 to-rose-500/20';
  if (title === 'Security') return 'from-amber-500/20 to-orange-500/20';
  return 'from-violet-500/20 to-purple-500/20';
}

/* ------------------------------------------------------------------
 * EditableSection
 * ----------------------------------------------------------------*/
function EditableSection({ icon: Icon, title, desc, fields, data, onSave, onFieldChange, isPending }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({});

  const startEditing = () => {
    const initial = {};
    fields.forEach((f) => {
      initial[f.key] = data?.[f.key] ?? '';
    });
    setEditValues(initial);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = () => {
    const converted = {};
    fields.forEach((f) => {
      const val = editValues[f.key];
      converted[f.key] = f.type === 'number' ? Number(val) : val;
    });
    onSave(converted);
    setIsEditing(false);
  };

  const handleFieldChange = (key, value, field) => {
    setEditValues((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-update cost when model changes
      if (field?.type === 'model-select' && field.costKey) {
        const selectedModel = field.modelOptions?.find((o) => o.value === value);
        if (selectedModel) {
          next[field.costKey] = selectedModel.cost;
        }
      }
      return next;
    });
    if (onFieldChange) onFieldChange(key, value, field);
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${sectionGradient(title)} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
          <p className="text-xs text-text-muted dark:text-text-muted-dark">{desc}</p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={cancelEditing}
                className="btn-ghost btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="btn-primary btn-sm"
              >
                {isPending ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <button
              onClick={startEditing}
              className="btn-secondary btn-sm"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {fields.map((field) => (
          <div
            key={field.key}
            className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-border/30 dark:border-white/[0.04] hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-colors"
          >
            <span className="text-sm text-text-muted dark:text-text-muted-dark">{field.label}</span>
            {isEditing ? (
              <FieldInput field={field} value={editValues[field.key]} onChange={handleFieldChange} />
            ) : (
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {displayValue(field, data?.[field.key])}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * FieldInput
 * ----------------------------------------------------------------*/
function FieldInput({ field, value, onChange }) {
  const baseClass =
    'input text-sm font-medium text-right';

  if (field.type === 'select') {
    return (
      <select
        value={value ?? ''}
        onChange={(e) => onChange(field.key, e.target.value, field)}
        className={`${baseClass} w-40`}
      >
        {field.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'model-select') {
    return (
      <select
        value={value ?? ''}
        onChange={(e) => onChange(field.key, e.target.value, field)}
        className={`${baseClass} w-64`}
      >
        {field.modelOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label} (${opt.cost}/unit)
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'number') {
    return (
      <input
        type="number"
        value={value ?? ''}
        min={field.min}
        max={field.max}
        onChange={(e) => onChange(field.key, e.target.value, field)}
        className={`${baseClass} w-32`}
      />
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(field.key, e.target.value, field)}
        rows={2}
        className={`${baseClass} w-64 text-left resize-none`}
      />
    );
  }

  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(field.key, e.target.value, field)}
      className={`${baseClass} w-64`}
    />
  );
}

/* ------------------------------------------------------------------
 * ReadOnlySection
 * ----------------------------------------------------------------*/
function ReadOnlySection({ icon: Icon, title, desc, items }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${sectionGradient(title)} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
          <p className="text-xs text-text-muted dark:text-text-muted-dark">{desc}</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-border/30 dark:border-white/[0.04] hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-colors"
          >
            <span className="text-sm text-text-muted dark:text-text-muted-dark">{item.label}</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * SocialAccountsSection
 * ----------------------------------------------------------------*/
const PLATFORMS = [
  { key: 'tiktok', label: 'TikTok', color: 'text-pink-500' },
  { key: 'instagram', label: 'Instagram', color: 'text-purple-500' },
  { key: 'youtube_shorts', label: 'YouTube Shorts', color: 'text-red-500' },
];

function SocialAccountsSection({ projectId }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    supabase
      .from('social_accounts')
      .select('*')
      .eq('project_id', projectId)
      .then(({ data }) => {
        setAccounts(data || []);
        setLoading(false);
      });
  }, [projectId]);

  const accountByPlatform = {};
  accounts.forEach((a) => { accountByPlatform[a.platform] = a; });

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${sectionGradient('Social Media Accounts')} flex items-center justify-center`}>
          <Share2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Social Media Accounts</h2>
          <p className="text-xs text-text-muted dark:text-text-muted-dark">Connected accounts for shorts distribution</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {PLATFORMS.map((platform) => {
            const acct = accountByPlatform[platform.key];
            return (
              <div
                key={platform.key}
                className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-border/30 dark:border-white/[0.04]"
              >
                <span className={`text-sm font-medium ${platform.color}`}>{platform.label}</span>
                {acct && acct.is_active ? (
                  <span className="badge badge-green">
                    Connected: {acct.account_name || acct.account_id || 'Active'}
                  </span>
                ) : (
                  <span className="badge bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
                    Not Connected
                  </span>
                )}
              </div>
            );
          })}
          <p className="text-xs text-text-muted dark:text-text-muted-dark mt-2">
            Manage credentials in{' '}
            <a
              href="https://n8n.srv1297445.hstgr.cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              n8n Settings &rarr; Credentials
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
 * DangerZone - typed confirmation actions
 * ----------------------------------------------------------------*/
function DangerZoneAction({ label, description, confirmWord, variant, onExecute }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [typed, setTyped] = useState('');
  const [executing, setExecuting] = useState(false);

  const isMatch = typed === confirmWord;

  const handleExecute = async () => {
    if (!isMatch) return;
    setExecuting(true);
    try {
      await onExecute();
      toast.success(`${label} completed`);
      setShowConfirm(false);
      setTyped('');
    } catch (err) {
      toast.error(err?.message || `${label} failed`);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
          <p className="text-xs text-text-muted dark:text-text-muted-dark">{description}</p>
        </div>
        <button
          onClick={() => setShowConfirm(!showConfirm)}
          className={`btn-sm ${variant === 'danger' ? 'btn-danger' : 'btn-secondary'}`}
        >
          {label}
        </button>
      </div>
      {showConfirm && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-500/[0.06] border border-red-200 dark:border-red-500/20">
          <p className="text-xs text-red-700 dark:text-red-300 mb-2">
            Type <strong className="font-mono">{confirmWord}</strong> to confirm:
          </p>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="input text-sm mb-2"
            placeholder={`Type "${confirmWord}" to confirm`}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleExecute}
              disabled={!isMatch || executing}
              className="btn-danger btn-sm"
            >
              {executing ? 'Processing...' : 'Confirm'}
            </button>
            <button
              onClick={() => { setShowConfirm(false); setTyped(''); }}
              className="btn-ghost btn-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DangerZone({ projectId, projectName }) {
  const navigate = useNavigate();

  return (
    <div className="glass-card p-6 border-red-500/30 dark:border-red-500/20" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h2 className="text-base font-bold text-red-600 dark:text-red-400 tracking-tight">Danger Zone</h2>
          <p className="text-xs text-text-muted dark:text-text-muted-dark">Irreversible actions</p>
        </div>
      </div>

      <div className="divide-y divide-red-100 dark:divide-red-500/10">
        <DangerZoneAction
          label="Reset All Topics"
          description="Delete all topics, avatars, scenes, shorts, and production logs"
          confirmWord="RESET"
          variant="secondary"
          onExecute={() => resetAllTopics(projectId)}
        />
        <DangerZoneAction
          label="Clear Production Data"
          description="Remove scenes and shorts, reset topic progress to pending"
          confirmWord="CLEAR"
          variant="secondary"
          onExecute={() => clearProductionData(projectId)}
        />
        <DangerZoneAction
          label="Delete Project"
          description="Permanently delete this project and all associated data"
          confirmWord={projectName || 'DELETE'}
          variant="danger"
          onExecute={async () => {
            await deleteProject(projectId);
            navigate('/');
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * ConfigTab
 * ----------------------------------------------------------------*/
export default function ConfigTab({ projectId }) {
  const { data, isLoading } = useProjectSettings(projectId);
  const updateMutation = useUpdateSettings(projectId);

  if (isLoading || !data) {
    return (
      <div data-testid="config-loading" className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="config-tab" className="space-y-4">
      {/* Editable: Project Info */}
      <EditableSection
        icon={Folder}
        title="Project Info"
        desc="Project name, niche, and description"
        fields={projectInfoFields}
        data={data}
        onSave={(fields) => updateMutation.mutate(fields)}
        isPending={updateMutation.isPending}
      />

      {/* Editable: Production Config */}
      <EditableSection
        icon={Database}
        title="Production Config"
        desc="Script approach, model selection, word count targets"
        fields={productionFields}
        data={data}
        onSave={(fields) => updateMutation.mutate(fields)}
        isPending={updateMutation.isPending}
      />

      {/* Editable: YouTube & Drive */}
      <EditableSection
        icon={Youtube}
        title="YouTube & Drive"
        desc="Channel ID, playlist IDs, Drive folder configuration"
        fields={youtubeFields}
        data={data}
        onSave={(fields) => updateMutation.mutate(fields)}
        isPending={updateMutation.isPending}
      />

      {/* Social Media Accounts */}
      <SocialAccountsSection projectId={projectId} />

      {/* Read-only: API & Webhooks */}
      <ReadOnlySection
        icon={Webhook}
        title="API & Webhooks"
        desc="n8n webhook base, Supabase connection, API tokens"
        items={[
          { label: 'n8n URL', value: 'n8n.srv1297445.hstgr.cloud' },
          { label: 'Supabase URL', value: 'supabase.operscale.cloud' },
          { label: 'Webhook Status', value: 'Connected' },
        ]}
      />

      {/* Read-only: Security */}
      <ReadOnlySection
        icon={Shield}
        title="Security"
        desc="PIN and session management"
        items={[
          { label: 'Session Duration', value: '30 days' },
        ]}
      />

      {/* Read-only: Appearance */}
      <ReadOnlySection
        icon={Palette}
        title="Appearance"
        desc="Theme and display preferences"
        items={[
          { label: 'Theme', value: 'System (toggle in sidebar)' },
        ]}
      />

      {/* Danger Zone */}
      <DangerZone projectId={projectId} projectName={data?.name || data?.niche || ''} />
    </div>
  );
}
