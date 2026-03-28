import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Database,
  Youtube,
  Webhook,
  Shield,
  Palette,
  Pencil,
  Folder,
  Share2,
  AlertTriangle,
  Trash2,
  RotateCcw,
  XCircle,
  Loader2,
  Link2,
  Unlink,
  Zap,
  Music,
  Activity,
  CheckCircle2,
  Clock,
  Upload,
  DollarSign,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useProjectSettings, useUpdateSettings } from '../../hooks/useProjectSettings';
import { supabase } from '../../lib/supabase';
import { resetAllTopics, clearProductionData, deleteProject } from '../../lib/settingsApi';
import { webhookCall } from '../../lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import AccountCard from '../social/AccountCard';

// -- Model options with costs -------------------------------------------------

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

// -- Field definitions --------------------------------------------------------

const generalFields = [
  { key: 'name', label: 'Project Name', type: 'text' },
  { key: 'niche', label: 'Niche', type: 'text' },
  { key: 'niche_description', label: 'Niche Description', type: 'textarea' },
  { key: 'script_approach', label: 'Script Approach', type: 'switch', options: [
    { value: '3_pass', label: '3-Pass' },
    { value: 'single_call', label: 'Single Call' },
  ]},
  { key: 'target_word_count', label: 'Target Word Count', type: 'number', min: 5000, max: 30000 },
  { key: 'target_scene_count', label: 'Target Scene Count', type: 'number', min: 50, max: 300 },
];

const modelFields = [
  { key: 'image_model', label: 'Image Model', type: 'model-select', modelOptions: IMAGE_MODEL_OPTIONS, costKey: 'image_cost' },
  { key: 'images_per_video', label: 'Images Per Video', type: 'number', min: 10, max: 200 },
  { key: 'i2v_model', label: 'I2V Model', type: 'model-select', modelOptions: I2V_MODEL_OPTIONS, costKey: 'i2v_cost' },
  { key: 'i2v_clips_per_video', label: 'I2V Clips Per Video', type: 'number', min: 5, max: 100 },
  { key: 't2v_model', label: 'T2V Model', type: 'model-select', modelOptions: T2V_MODEL_OPTIONS, costKey: 't2v_cost' },
  { key: 't2v_clips_per_video', label: 'T2V Clips Per Video', type: 'number', min: 10, max: 200 },
];

const youtubeFields = [
  { key: 'youtube_channel_id', label: 'Channel ID', type: 'text' },
  { key: 'youtube_playlist1_id', label: 'Playlist 1 ID', type: 'text' },
  { key: 'youtube_playlist2_id', label: 'Playlist 2 ID', type: 'text' },
  { key: 'youtube_playlist3_id', label: 'Playlist 3 ID', type: 'text' },
  { key: 'drive_root_folder_id', label: 'Drive Root Folder ID', type: 'text' },
  { key: 'drive_assets_folder_id', label: 'Drive Assets Folder ID', type: 'text' },
];

// -- Display helpers ----------------------------------------------------------

function displayValue(field, value) {
  if (value == null || value === '') return '--';
  if (field.type === 'switch') {
    const opt = field.options?.find((o) => o.value === value);
    return opt ? opt.label : String(value);
  }
  if (field.type === 'model-select') {
    const opt = field.modelOptions?.find((o) => o.value === value);
    return opt ? `${opt.label} ($${opt.cost}/unit)` : String(value);
  }
  return String(value);
}

// -- FieldRow -----------------------------------------------------------------

function FieldRow({ field, value, isEditing, editValue, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium shrink-0 mr-4">
        {field.label}
      </label>
      {isEditing ? (
        <FieldInput field={field} value={editValue} onChange={onChange} />
      ) : (
        <span className="text-sm font-medium text-right">
          {displayValue(field, value)}
        </span>
      )}
    </div>
  );
}

// -- FieldInput ---------------------------------------------------------------

function FieldInput({ field, value, onChange }) {
  if (field.type === 'switch') {
    const isThreePass = value === '3_pass';
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Single</span>
        <Switch
          checked={isThreePass}
          onCheckedChange={(checked) => onChange(field.key, checked ? '3_pass' : 'single_call', field)}
        />
        <span className="text-xs text-muted-foreground">3-Pass</span>
      </div>
    );
  }

  if (field.type === 'model-select') {
    return (
      <Select
        value={value ?? ''}
        onValueChange={(val) => onChange(field.key, val, field)}
      >
        <SelectTrigger className="w-64 h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {field.modelOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label} (${opt.cost}/unit)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === 'number') {
    return (
      <Input
        type="number"
        value={value ?? ''}
        min={field.min}
        max={field.max}
        onChange={(e) => onChange(field.key, e.target.value, field)}
        className="w-32 h-9 text-sm text-right"
      />
    );
  }

  if (field.type === 'textarea') {
    return (
      <Textarea
        value={value ?? ''}
        onChange={(e) => onChange(field.key, e.target.value, field)}
        rows={2}
        className="w-64 text-sm resize-none"
      />
    );
  }

  return (
    <Input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(field.key, e.target.value, field)}
      className="w-64 h-9 text-sm"
    />
  );
}

// -- EditableSection ----------------------------------------------------------

function EditableSection({ title, description, fields, data, onSave, isPending }) {
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
      if (field?.type === 'model-select' && field.costKey) {
        const selectedModel = field.modelOptions?.find((o) => o.value === value);
        if (selectedModel) {
          next[field.costKey] = selectedModel.cost;
        }
      }
      return next;
    });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-4">
        <div>
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={cancelEditing}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg px-4">
        {fields.map((field) => (
          <FieldRow
            key={field.key}
            field={field}
            value={data?.[field.key]}
            isEditing={isEditing}
            editValue={editValues[field.key]}
            onChange={handleFieldChange}
          />
        ))}
      </div>
    </div>
  );
}

// -- SocialAccountsSection ----------------------------------------------------

const PLATFORMS = [
  { key: 'tiktok', label: 'TikTok' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube_shorts', label: 'YouTube Shorts' },
];

function SocialAccountsSection({ projectId }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchAccounts = () => {
    if (!projectId) return;
    supabase
      .from('social_accounts')
      .select('*')
      .eq('project_id', projectId)
      .then(({ data }) => {
        setAccounts(data || []);
        setLoading(false);
      });
  };

  useEffect(() => { fetchAccounts(); }, [projectId]);

  const accountByPlatform = {};
  accounts.forEach((a) => { accountByPlatform[a.platform] = a; });

  const handleConnect = async (platformKey) => {
    setActionLoading(platformKey);
    try {
      const result = await webhookCall('social/connect', {
        platform: platformKey,
        project_id: projectId,
      }, { timeoutMs: 60_000 });
      if (result?.success === false) {
        toast.error(result.error || `Failed to connect ${platformKey}`);
      } else if (result?.oauth_url) {
        window.open(result.oauth_url, '_blank', 'noopener,noreferrer');
        toast.success('OAuth window opened. Complete the flow, then refresh.');
      } else {
        toast.success(`${platformKey} connection initiated`);
        fetchAccounts();
      }
    } catch (err) {
      toast.error(err.message || 'Connection failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (platformKey, accountId) => {
    setActionLoading(platformKey);
    try {
      const { error } = await supabase
        .from('social_accounts')
        .update({ is_active: false })
        .eq('id', accountId);
      if (error) {
        toast.error(error.message || 'Failed to disconnect');
      } else {
        toast.success(`${platformKey} disconnected`);
        fetchAccounts();
      }
    } catch (err) {
      toast.error(err.message || 'Disconnect failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Connected Accounts</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage social media accounts for shorts distribution
        </p>
      </div>

      <div className="space-y-3">
        {PLATFORMS.map((platform) => (
          <AccountCard
            key={platform.key}
            platform={platform.key}
            account={accountByPlatform[platform.key]}
            isLoading={actionLoading === platform.key}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        OAuth credentials are managed via n8n.{' '}
        <a
          href="https://n8n.srv1297445.hstgr.cloud"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Open n8n Credentials &rarr;
        </a>
      </p>
    </div>
  );
}

// -- DangerZone ---------------------------------------------------------------

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
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button
          variant={variant === 'danger' ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => setShowConfirm(!showConfirm)}
        >
          {label}
        </Button>
      </div>
      {showConfirm && (
        <div className="mt-3 p-3 rounded-lg bg-danger-bg border border-danger-border">
          <p className="text-xs text-danger mb-2">
            Type <strong className="font-mono">{confirmWord}</strong> to confirm:
          </p>
          <Input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="mb-2 h-9 text-sm"
            placeholder={`Type "${confirmWord}" to confirm`}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleExecute}
              disabled={!isMatch || executing}
            >
              {executing ? 'Processing...' : 'Confirm'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowConfirm(false); setTyped(''); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DangerZone({ projectId, projectName }) {
  const navigate = useNavigate();

  return (
    <div className="mt-8 bg-danger-bg border border-danger-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-danger" />
        <h3 className="text-sm font-semibold text-danger">Danger Zone</h3>
      </div>

      <div className="divide-y divide-danger-border">
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

// -- ReadOnlySection ----------------------------------------------------------

function ReadOnlySection({ title, items }) {
  return (
    <div className="space-y-1">
      {title && <h3 className="text-sm font-semibold mb-3">{title}</h3>}
      <div className="bg-card border border-border rounded-lg px-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between py-3 border-b border-border last:border-0"
          >
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{item.label}</span>
            <span className="text-sm font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- AutoPilotSection ---------------------------------------------------------

function AutoPilotSection({ data, onSave, isPending }) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({});

  const startEditing = () => {
    setValues({
      auto_pilot_enabled: data?.auto_pilot_enabled ?? false,
      auto_pilot_topic_threshold: data?.auto_pilot_topic_threshold ?? 8.0,
      auto_pilot_script_threshold: data?.auto_pilot_script_threshold ?? 7.5,
      auto_pilot_default_visibility: data?.auto_pilot_default_visibility ?? 'unlisted',
      monthly_budget_usd: data?.monthly_budget_usd ?? '',
    });
    setEditing(true);
  };

  const handleSave = () => {
    onSave({
      auto_pilot_enabled: values.auto_pilot_enabled,
      auto_pilot_topic_threshold: Number(values.auto_pilot_topic_threshold),
      auto_pilot_script_threshold: Number(values.auto_pilot_script_threshold),
      auto_pilot_default_visibility: values.auto_pilot_default_visibility,
      monthly_budget_usd: values.monthly_budget_usd ? Number(values.monthly_budget_usd) : null,
    });
    setEditing(false);
  };

  const isEnabled = editing ? values.auto_pilot_enabled : (data?.auto_pilot_enabled ?? false);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            Auto-Pilot Configuration
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automate approvals based on quality thresholds
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                {isPending ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Enable toggle */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable Auto-Pilot</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Automatically approve topics and scripts that exceed quality thresholds
            </p>
          </div>
          {editing ? (
            <Switch
              checked={values.auto_pilot_enabled}
              onCheckedChange={(checked) => setValues((prev) => ({ ...prev, auto_pilot_enabled: checked }))}
            />
          ) : (
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isEnabled ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
              {isEnabled ? 'Enabled' : 'Disabled'}
            </span>
          )}
        </div>
      </div>

      {/* Threshold fields */}
      <div className="bg-card border border-border rounded-xl px-4">
        {/* Topic threshold */}
        <div className="flex items-center justify-between py-3 border-b border-border">
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Topic Score Threshold
          </label>
          {editing ? (
            <Input
              type="number"
              value={values.auto_pilot_topic_threshold}
              min={1}
              max={10}
              step={0.5}
              onChange={(e) => setValues((prev) => ({ ...prev, auto_pilot_topic_threshold: e.target.value }))}
              className="w-24 h-9 text-sm text-right bg-muted border-border"
            />
          ) : (
            <span className="text-sm font-medium">{data?.auto_pilot_topic_threshold ?? 8.0}</span>
          )}
        </div>

        {/* Script threshold */}
        <div className="flex items-center justify-between py-3 border-b border-border">
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Script Eval Threshold
          </label>
          {editing ? (
            <Input
              type="number"
              value={values.auto_pilot_script_threshold}
              min={1}
              max={10}
              step={0.5}
              onChange={(e) => setValues((prev) => ({ ...prev, auto_pilot_script_threshold: e.target.value }))}
              className="w-24 h-9 text-sm text-right bg-muted border-border"
            />
          ) : (
            <span className="text-sm font-medium">{data?.auto_pilot_script_threshold ?? 7.5}</span>
          )}
        </div>

        {/* Default visibility */}
        <div className="flex items-center justify-between py-3 border-b border-border">
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Default Visibility
          </label>
          {editing ? (
            <Select
              value={values.auto_pilot_default_visibility}
              onValueChange={(val) => setValues((prev) => ({ ...prev, auto_pilot_default_visibility: val }))}
            >
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="unlisted">Unlisted</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm font-medium capitalize">{data?.auto_pilot_default_visibility ?? 'unlisted'}</span>
          )}
        </div>

        {/* Monthly budget */}
        <div className="flex items-center justify-between py-3">
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Monthly Budget (USD)
          </label>
          {editing ? (
            <div className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              <Input
                type="number"
                value={values.monthly_budget_usd}
                min={0}
                step={50}
                placeholder="No limit"
                onChange={(e) => setValues((prev) => ({ ...prev, monthly_budget_usd: e.target.value }))}
                className="w-28 h-9 text-sm text-right bg-muted border-border"
              />
            </div>
          ) : (
            <span className="text-sm font-medium">
              {data?.monthly_budget_usd ? `$${Number(data.monthly_budget_usd).toLocaleString()}` : 'No limit'}
            </span>
          )}
        </div>
      </div>

      {/* Warning box */}
      <div className="bg-warning-bg border border-warning-border rounded-lg p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <p className="text-warning text-xs leading-relaxed">
          Auto-pilot publishes as <strong>UNLISTED</strong> only. Human review is required to set videos to public visibility.
        </p>
      </div>
    </div>
  );
}

// -- MusicLibrarySection ------------------------------------------------------

function formatDuration(ms) {
  if (!ms) return '--';
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function MusicLibrarySection() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', mood_tags: '', bpm: '', file_url: '' });

  const fetchTracks = useCallback(() => {
    setLoading(true);
    supabase
      .from('music_library')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error('Failed to load music library');
          setTracks([]);
        } else {
          setTracks(data || []);
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchTracks(); }, [fetchTracks]);

  const handleUpload = async () => {
    if (!uploadForm.title || !uploadForm.file_url) {
      toast.error('Title and file URL are required');
      return;
    }
    const moodTags = uploadForm.mood_tags
      ? uploadForm.mood_tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];
    const { error } = await supabase
      .from('music_library')
      .insert({
        title: uploadForm.title,
        mood_tags: moodTags,
        bpm: uploadForm.bpm ? Number(uploadForm.bpm) : null,
        file_url: uploadForm.file_url,
      });
    if (error) {
      toast.error(error.message || 'Failed to add track');
    } else {
      toast.success('Track added');
      setUploadForm({ title: '', mood_tags: '', bpm: '', file_url: '' });
      setShowUpload(false);
      fetchTracks();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Music className="w-4 h-4 text-accent" />
            Music Library
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Background music tracks available for video production
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowUpload(!showUpload)}
        >
          <Upload className="w-3.5 h-3.5" />
          {showUpload ? 'Cancel' : 'Add Track'}
        </Button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Title</label>
              <Input
                value={uploadForm.title}
                onChange={(e) => setUploadForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Track title"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">BPM</label>
              <Input
                type="number"
                value={uploadForm.bpm}
                onChange={(e) => setUploadForm((p) => ({ ...p, bpm: e.target.value }))}
                placeholder="120"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Mood Tags (comma-separated)</label>
            <Input
              value={uploadForm.mood_tags}
              onChange={(e) => setUploadForm((p) => ({ ...p, mood_tags: e.target.value }))}
              placeholder="cinematic, epic, dark"
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">File URL</label>
            <Input
              value={uploadForm.file_url}
              onChange={(e) => setUploadForm((p) => ({ ...p, file_url: e.target.value }))}
              placeholder="https://drive.google.com/..."
              className="h-9 text-sm"
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleUpload}>
              <Upload className="w-3.5 h-3.5" />
              Add Track
            </Button>
          </div>
        </div>
      )}

      {/* Tracks table */}
      {tracks.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Music className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="text-sm text-muted-foreground">No tracks in library</p>
          <p className="text-xs text-muted-foreground mt-1">Add your first background music track above</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Mood Tags</TableHead>
                <TableHead className="text-xs text-right">BPM</TableHead>
                <TableHead className="text-xs text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks.map((track) => (
                <TableRow key={track.id}>
                  <TableCell className="text-sm font-medium py-2.5">{track.title || '--'}</TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {(track.mood_tags || []).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                      {(!track.mood_tags || track.mood_tags.length === 0) && (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-right py-2.5">{track.bpm || '--'}</TableCell>
                  <TableCell className="text-sm text-right py-2.5">{formatDuration(track.duration_ms)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {tracks.length} track{tracks.length !== 1 ? 's' : ''} in library.
        Tracks are auto-selected by mood matching during production.
      </p>
    </div>
  );
}

// -- ApiHealthSection ---------------------------------------------------------

const SERVICE_CHECKS = [
  {
    key: 'supabase',
    label: 'Supabase',
    description: 'Database & Realtime subscriptions',
    icon: Database,
  },
  {
    key: 'n8n',
    label: 'n8n',
    description: 'Workflow orchestration engine',
    icon: Webhook,
  },
  {
    key: 'fal',
    label: 'Fal.ai',
    description: 'Image & video generation',
    icon: Zap,
  },
  {
    key: 'youtube',
    label: 'YouTube',
    description: 'Video publishing & analytics',
    icon: Youtube,
  },
  {
    key: 'drive',
    label: 'Google Drive',
    description: 'File storage & sharing',
    icon: Folder,
  },
];

function ApiHealthSection({ data }) {
  const [statuses, setStatuses] = useState({});
  const [checking, setChecking] = useState(false);

  const runChecks = useCallback(async (projectData) => {
    setChecking(true);
    const results = {};

    // Supabase check -- simple query
    try {
      const { error } = await supabase.from('projects').select('id').limit(1);
      results.supabase = error ? 'error' : 'connected';
    } catch {
      results.supabase = 'error';
    }

    // n8n check -- GET the webhook base to see if n8n responds
    try {
      const webhookBase = import.meta.env.VITE_N8N_WEBHOOK_BASE || '/webhook';
      const resp = await fetch(`${webhookBase}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      results.n8n = resp.ok || resp.status === 404 ? 'connected' : 'error';
    } catch {
      // n8n may not have a /health endpoint; 404 means n8n is up
      results.n8n = 'unknown';
    }

    // Fal.ai -- can't test from browser, show config status
    results.fal = 'unknown'; // Always unknown from browser side

    // YouTube -- check if channel_id is set
    results.youtube = projectData?.youtube_channel_id ? 'connected' : 'not_configured';

    // Google Drive -- check if drive_root_folder_id is set
    results.drive = projectData?.drive_root_folder_id ? 'connected' : 'not_configured';

    setStatuses(results);
    setChecking(false);
  }, []);

  useEffect(() => {
    runChecks(data);
  }, [data, runChecks]);

  const statusConfig = {
    connected: { dot: 'bg-success', label: 'Connected', textClass: 'text-success' },
    error: { dot: 'bg-danger', label: 'Error', textClass: 'text-danger' },
    unknown: { dot: 'bg-warning', label: 'Unknown', textClass: 'text-warning' },
    not_configured: { dot: 'bg-muted-foreground', label: 'Not configured', textClass: 'text-muted-foreground' },
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            API Health
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connection status for all external services
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => runChecks(data)}
          disabled={checking}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking...' : 'Re-check'}
        </Button>
      </div>

      <div className="space-y-3">
        {SERVICE_CHECKS.map((service) => {
          const status = statuses[service.key] || 'unknown';
          const cfg = statusConfig[status] || statusConfig.unknown;
          const Icon = service.icon;

          return (
            <div
              key={service.key}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{service.label}</p>
                <p className="text-xs text-muted-foreground">{service.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                <span className={`text-xs font-medium ${cfg.textClass}`}>{cfg.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Fal.ai credentials are stored in n8n and cannot be verified from the browser.
        YouTube and Drive show configuration status only.
      </p>
    </div>
  );
}

// -- ConfigTab ----------------------------------------------------------------

export default function ConfigTab({ projectId, section = 'general' }) {
  const { data, isLoading } = useProjectSettings(projectId);
  const updateMutation = useUpdateSettings(projectId);

  if (isLoading || !data) {
    return (
      <div data-testid="config-loading" className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleSave = (fields) => updateMutation.mutate(fields);
  const isPending = updateMutation.isPending;

  // -- General tab
  if (section === 'general') {
    return (
      <div data-testid="config-tab" className="space-y-6 max-w-2xl">
        <EditableSection
          fields={generalFields}
          data={data}
          onSave={handleSave}
          isPending={isPending}
        />

        <ReadOnlySection
          title="System Info"
          items={[
            { label: 'n8n URL', value: 'n8n.srv1297445.hstgr.cloud' },
            { label: 'Supabase URL', value: 'supabase.operscale.cloud' },
            { label: 'Webhook Status', value: 'Connected' },
            { label: 'Session Duration', value: '30 days' },
            { label: 'Theme', value: 'System (toggle in sidebar)' },
          ]}
        />

        <DangerZone projectId={projectId} projectName={data?.name || data?.niche || ''} />
      </div>
    );
  }

  // -- Models tab
  if (section === 'models') {
    return (
      <div data-testid="config-tab" className="space-y-6 max-w-2xl">
        <EditableSection
          title="Model Selection"
          description="Image and video generation models with per-unit costs"
          fields={modelFields}
          data={data}
          onSave={handleSave}
          isPending={isPending}
        />
      </div>
    );
  }

  // -- YouTube tab
  if (section === 'youtube') {
    return (
      <div data-testid="config-tab" className="space-y-6 max-w-2xl">
        <EditableSection
          title="YouTube & Drive"
          description="Channel ID, playlist IDs, and Google Drive folder configuration"
          fields={youtubeFields}
          data={data}
          onSave={handleSave}
          isPending={isPending}
        />

        <ReadOnlySection
          title="Quota"
          items={[
            { label: 'Daily Upload Quota', value: '10,000 units (max 6 uploads/day)' },
          ]}
        />
      </div>
    );
  }

  // -- Social tab
  if (section === 'social') {
    return (
      <div data-testid="config-tab" className="space-y-6 max-w-2xl">
        <SocialAccountsSection projectId={projectId} />
      </div>
    );
  }

  // -- Auto-Pilot tab
  if (section === 'autopilot') {
    return (
      <div data-testid="config-tab">
        <AutoPilotSection data={data} onSave={handleSave} isPending={isPending} />
      </div>
    );
  }

  // -- Music tab
  if (section === 'music') {
    return (
      <div data-testid="config-tab">
        <MusicLibrarySection />
      </div>
    );
  }

  // -- API Health tab
  if (section === 'apihealth') {
    return (
      <div data-testid="config-tab">
        <ApiHealthSection data={data} />
      </div>
    );
  }

  return null;
}
