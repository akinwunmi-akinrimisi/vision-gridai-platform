import { useState } from 'react';
import { useParams } from 'react-router';
import ConfigTab from '../components/settings/ConfigTab';
import PromptsTab from '../components/settings/PromptsTab';

const TABS = [
  { key: 'config', label: 'Configuration' },
  { key: 'prompts', label: 'Prompts' },
];

export default function Settings() {
  const { id: projectId } = useParams();
  const [activeTab, setActiveTab] = useState('config');

  return (
    <div className="animate-in max-w-3xl">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Per-project configuration and prompts</p>
      </div>

      {/* Tab bar */}
      <div className="border border-border/50 dark:border-white/[0.06] rounded-xl p-1 inline-flex gap-1 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-white/10 shadow-sm text-slate-900 dark:text-white'
                : 'text-text-muted dark:text-text-muted-dark hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'config' && <ConfigTab projectId={projectId} />}
      {activeTab === 'prompts' && <PromptsTab projectId={projectId} />}
    </div>
  );
}
