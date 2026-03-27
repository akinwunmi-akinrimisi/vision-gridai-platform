import { useState, useEffect } from 'react';
import { Loader2, Save, X } from 'lucide-react';
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

  return (
    <SidePanel isOpen={isOpen} onClose={onClose} title="Edit Topic">
      {topic && (
        <div className="space-y-5">
          {/* Topic fields */}
          {TOPIC_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1.5">
                {field.label}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={topicFields[field.key] || ''}
                  onChange={(e) => setTopicFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  disabled={isLoading}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border
                    text-foreground placeholder:text-muted-foreground
                    focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40
                    disabled:opacity-50 transition-all resize-none"
                />
              ) : (
                <input
                  type="text"
                  value={topicFields[field.key] || ''}
                  onChange={(e) => setTopicFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  disabled={isLoading}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border
                    text-foreground placeholder:text-muted-foreground
                    focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40
                    disabled:opacity-50 transition-all"
                />
              )}
            </div>
          ))}

          {/* Avatar section */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-xs font-semibold mb-3">Customer Avatar</h3>
            <div className="space-y-3">
              {AVATAR_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1.5">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={avatarFields[field.key] || ''}
                    onChange={(e) => setAvatarFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    disabled={isLoading}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-muted border border-border
                      text-foreground placeholder:text-muted-foreground
                      focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40
                      disabled:opacity-50 transition-all"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                text-muted-foreground hover:text-foreground hover:bg-muted
                border border-border transition-colors cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold
                bg-primary text-primary-foreground hover:bg-primary-hover
                transition-colors cursor-pointer shadow-glow-primary
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </SidePanel>
  );
}
