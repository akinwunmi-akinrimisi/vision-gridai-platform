import { useState, useMemo, useCallback } from 'react';
import ChapterAccordion from './ChapterAccordion';
import SceneRow from './SceneRow';
import SceneEditForm from './SceneEditForm';
import ScriptToolbar from './ScriptToolbar';

/**
 * Group scenes by chapter name, computing word count per chapter.
 * @param {Array} scenes - Flat array of scene objects with `.chapter` property
 * @returns {Array} chapters - [{ name, scenes, wordCount }]
 */
function groupByChapter(scenes) {
  const map = new Map();

  for (const scene of scenes) {
    const chapterName = scene.chapter || 'Untitled';
    if (!map.has(chapterName)) {
      map.set(chapterName, { name: chapterName, scenes: [], wordCount: 0 });
    }
    const chapter = map.get(chapterName);
    chapter.scenes.push(scene);
    if (scene.narration_text) {
      chapter.wordCount += scene.narration_text.split(/\s+/).filter(Boolean).length;
    }
  }

  return Array.from(map.values());
}

/**
 * ScriptContent -- Right column container for the Script Review split-panel.
 * Groups scenes by chapter, manages accordion state, editing, and search.
 */
export default function ScriptContent({ scenes, topic, onSceneEdit, onRegenPrompts }) {
  const chapters = useMemo(() => groupByChapter(scenes || []), [scenes]);

  // Expanded chapters: first chapter expanded by default
  const [expandedChapters, setExpandedChapters] = useState(() => {
    const initial = new Set();
    if (chapters.length > 0) {
      initial.add(chapters[0].name);
    }
    return initial;
  });

  // Scene editing state
  const [editingSceneId, setEditingSceneId] = useState(null);

  // Scenes marked for batch prompt regeneration
  const [editedSceneIds, setEditedSceneIds] = useState(new Set());

  // Image prompt visibility per scene
  const [visiblePrompts, setVisiblePrompts] = useState(new Set());

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  const toggleChapter = useCallback((name) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedChapters(new Set(chapters.map((c) => c.name)));
  }, [chapters]);

  const collapseAll = useCallback(() => {
    setExpandedChapters(new Set());
  }, []);

  const togglePrompt = useCallback((sceneId) => {
    setVisiblePrompts((prev) => {
      const next = new Set(prev);
      if (next.has(sceneId)) {
        next.delete(sceneId);
      } else {
        next.add(sceneId);
      }
      return next;
    });
  }, []);

  const handleStartEdit = useCallback((sceneId) => {
    setEditingSceneId(sceneId);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingSceneId(null);
  }, []);

  const handleSaveEdit = useCallback(
    (editedScene) => {
      onSceneEdit(editedScene);
      setEditedSceneIds((prev) => new Set(prev).add(editedScene.scene_id));
      setEditingSceneId(null);
    },
    [onSceneEdit]
  );

  const handleRegenPrompt = useCallback((sceneId) => {
    setEditedSceneIds((prev) => new Set(prev).add(sceneId));
  }, []);

  const handleBatchRegen = useCallback(() => {
    onRegenPrompts(Array.from(editedSceneIds));
    setEditedSceneIds(new Set());
  }, [editedSceneIds, onRegenPrompts]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query.toLowerCase());
  }, []);

  // Filter scenes when search is active
  const filteredChapters = useMemo(() => {
    if (!searchQuery) return chapters;

    const filtered = [];
    for (const chapter of chapters) {
      const matchingScenes = chapter.scenes.filter(
        (s) =>
          s.narration_text?.toLowerCase().includes(searchQuery) ||
          s.image_prompt?.toLowerCase().includes(searchQuery)
      );
      if (matchingScenes.length > 0) {
        filtered.push({
          ...chapter,
          scenes: matchingScenes,
          wordCount: matchingScenes.reduce(
            (acc, s) => acc + (s.narration_text?.split(/\s+/).filter(Boolean).length || 0),
            0
          ),
        });
      }
    }
    return filtered;
  }, [chapters, searchQuery]);

  if (!scenes || scenes.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No scenes available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4" data-testid="script-content">
      <ScriptToolbar
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        editedSceneCount={editedSceneIds.size}
        onRegenPrompts={handleBatchRegen}
        onSearch={handleSearch}
        passInfo={{
          approach: '3-pass',
          attempt: topic?.script_attempts || 1,
        }}
      />

      <div className="space-y-1 mt-2">
        {filteredChapters.map((chapter) => (
          <ChapterAccordion
            key={chapter.name}
            chapter={chapter}
            isExpanded={expandedChapters.has(chapter.name) || !!searchQuery}
            onToggle={() => toggleChapter(chapter.name)}
          >
            {chapter.scenes.map((scene) => {
              const sceneId = scene.id || scene.scene_id;
              const isEditing = editingSceneId === sceneId;

              return isEditing ? (
                <SceneEditForm
                  key={sceneId}
                  scene={scene}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                  onRegenPrompt={handleRegenPrompt}
                />
              ) : (
                <SceneRow
                  key={sceneId}
                  scene={scene}
                  isEditing={false}
                  onStartEdit={handleStartEdit}
                  onTogglePrompt={togglePrompt}
                  showPrompt={visiblePrompts.has(sceneId)}
                />
              );
            })}
          </ChapterAccordion>
        ))}

        {searchQuery && filteredChapters.length === 0 && (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No scenes match &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
