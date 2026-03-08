import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import SidePanel from '../ui/SidePanel';

const TOPIC_FIELDS = [
  { key: 'seo_title', label: 'SEO Title', type: 'text' },
  { key: 'narrative_hook', label: 'Narrative Hook', type: 'textarea' },
  { key: 'key_segments', label: 'Key Segments', type: 'textarea' },
  { key: 'estimated_cpm', label: 'Estimated CPM', type: 'text' },
  { key: 'viral_potential', label: 'Viral Potential', type: 'text' },
];

const AVATAR_FIELDS = [
  { key: 'avatar_name_age', label: 'Name & Age' },
  { key: 'occupation_income', label: 'Occupation & Income' },
  { key: 'life_stage', label: 'Life Stage' },
  { key: 'pain_point', label: 'Pain Point' },
  { key: 'spending_profile', label: 'Spending Profile' },
  { key: 'knowledge_level', label: 'Knowledge Level' },
  { key: 'emotional_driver', label: 'Emotional Driver' },
  { key: 'online_hangouts', label: 'Online Hangouts' },
  { key: 'objection', label: 'Objection' },
  { key: 'dream_outcome', label: 'Dream Outcome' },
];

export default function EditPanel({ topic, onClose, onSubmit, isLoading }) {
  const [topicFields, setTopicFields] = useState({});
  const [avatarFields, setAvatarFields] = useState({});

  const isOpen = !!topic;

  // Initialize form when topic changes
  useEffect(() => {
    if (topic) {
      const tf = {};
      for (const f of TOPIC_FIELDS) {
        tf[f.key] = topic[f.key] || '';
      }
      setTopicFields(tf);

      const avatar = topic.avatars?.[0] || {};
      const af = {};
      for (const f of AVATAR_FIELDS) {
        af[f.key] = avatar[f.key] || '';
      }
      setAvatarFields(af);
    }
  }, [topic]);

  const handleSubmit = () => {
    const fields = { ...topicFields };
    // Include avatar fields under a nested key
    const avatarChanges = {};
    let hasAvatarChanges = false;
    const avatar = topic?.avatars?.[0] || {};
    for (const f of AVATAR_FIELDS) {
      if (avatarFields[f.key] !== (avatar[f.key] || '')) {
        avatarChanges[f.key] = avatarFields[f.key];
        hasAvatarChanges = true;
      }
    }
    if (hasAvatarChanges) {
      fields.avatar = avatarChanges;
    }
    onSubmit(fields);
  };

  const inputClass = `w-full px-3 py-2 rounded-xl text-sm
    bg-white dark:bg-slate-800 border border-border dark:border-slate-700
    text-slate-900 dark:text-white placeholder:text-slate-400
    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
    disabled:opacity-50 transition-all duration-200`;

  return (
    <SidePanel isOpen={isOpen} onClose={onClose} title="Edit Topic">
      {topic && (
        <div className="space-y-5">
          {/* Topic fields */}
          {TOPIC_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {field.label}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={topicFields[field.key] || ''}
                  onChange={(e) => setTopicFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  disabled={isLoading}
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              ) : (
                <input
                  type="text"
                  value={topicFields[field.key] || ''}
                  onChange={(e) => setTopicFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  disabled={isLoading}
                  className={inputClass}
                />
              )}
            </div>
          ))}

          {/* Avatar section */}
          <div className="pt-4 border-t border-border/50 dark:border-white/[0.06]">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Customer Avatar</h3>
            <div className="space-y-3">
              {AVATAR_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={avatarFields[field.key] || ''}
                    onChange={(e) => setAvatarFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium
                text-slate-600 dark:text-slate-400
                hover:bg-slate-100 dark:hover:bg-white/[0.06]
                disabled:opacity-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                text-white bg-gradient-to-r from-primary to-indigo-600
                shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5
                disabled:opacity-50 disabled:hover:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      )}
    </SidePanel>
  );
}
