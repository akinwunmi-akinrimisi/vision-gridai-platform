import { useState } from 'react';
import { Database, Youtube, Webhook, Shield, Palette, Pencil } from 'lucide-react';
import { useProjectSettings, useUpdateSettings } from '../../hooks/useProjectSettings';

/* ------------------------------------------------------------------
 * Field definitions
 * ----------------------------------------------------------------*/
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
  { key: 'image_model', label: 'Image Model', type: 'text' },
  { key: 'i2v_model', label: 'I2V Model', type: 'text' },
  { key: 't2v_model', label: 'T2V Model', type: 'text' },
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
  return String(value);
}

/* ------------------------------------------------------------------
 * EditableSection
 * ----------------------------------------------------------------*/
function EditableSection({ icon: Icon, title, desc, fields, data, onSave, isPending }) {
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
    // Convert number fields to numbers
    const converted = {};
    fields.forEach((f) => {
      const val = editValues[f.key];
      converted[f.key] = f.type === 'number' ? Number(val) : val;
    });
    onSave(converted);
    setIsEditing(false);
  };

  const handleFieldChange = (key, value) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${title === 'Production Config' ? 'from-primary/20 to-indigo-500/20' : title === 'YouTube & Drive' ? 'from-red-500/20 to-rose-500/20' : title === 'API & Webhooks' ? 'from-emerald-500/20 to-teal-500/20' : title === 'Security' ? 'from-amber-500/20 to-orange-500/20' : 'from-violet-500/20 to-purple-500/20'} flex items-center justify-center`}>
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
        onChange={(e) => onChange(field.key, e.target.value)}
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

  if (field.type === 'number') {
    return (
      <input
        type="number"
        value={value ?? ''}
        min={field.min}
        max={field.max}
        onChange={(e) => onChange(field.key, e.target.value)}
        className={`${baseClass} w-32`}
      />
    );
  }

  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(field.key, e.target.value)}
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
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${title === 'API & Webhooks' ? 'from-emerald-500/20 to-teal-500/20' : title === 'Security' ? 'from-amber-500/20 to-orange-500/20' : 'from-violet-500/20 to-purple-500/20'} flex items-center justify-center`}>
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
    </div>
  );
}
