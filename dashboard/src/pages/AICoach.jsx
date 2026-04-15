import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router';
import { toast } from 'sonner';
import PageHeader from '../components/shared/PageHeader';
import SessionSidebar from '../components/coach/SessionSidebar';
import ChatPane from '../components/coach/ChatPane';
import MessageInput from '../components/coach/MessageInput';
import ContextSnapshotInspector from '../components/coach/ContextSnapshotInspector';
import {
  useCoachSessions,
  useCoachMessages,
  useSendCoachMessage,
  useCreateSession,
  useArchiveSession,
  useRenameSession,
} from '../hooks/useAICoach';

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AICoach() {
  const { id: projectId } = useParams();

  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [draftFocus, setDraftFocus] = useState('general'); // focus used before a session exists
  const [draftInput, setDraftInput] = useState('');
  const [contextMessage, setContextMessage] = useState(null);

  const { data: sessions = [], isLoading: sessionsLoading } = useCoachSessions(projectId);
  const { data: messages = [], isLoading: messagesLoading } = useCoachMessages(selectedSessionId);

  const sendMutation = useSendCoachMessage(projectId);
  const createMutation = useCreateSession(projectId);
  const archiveMutation = useArchiveSession(projectId);
  const renameMutation = useRenameSession(projectId);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) || null,
    [sessions, selectedSessionId],
  );

  // Auto-select the most recent non-archived session on load when none selected
  useEffect(() => {
    if (selectedSessionId) return;
    if (sessions.length === 0) return;
    const firstActive = sessions.find((s) => !s.is_archived);
    if (firstActive) setSelectedSessionId(firstActive.id);
  }, [sessions, selectedSessionId]);

  // When the selected session is archived elsewhere, drop selection
  useEffect(() => {
    if (!selectedSessionId) return;
    const stillExists = sessions.some((s) => s.id === selectedSessionId);
    if (!stillExists) setSelectedSessionId(null);
  }, [sessions, selectedSessionId]);

  /* -- Handlers -- */

  const effectiveFocus = selectedSession?.focus_area || draftFocus;

  const handleSend = async () => {
    const text = draftInput.trim();
    if (!text) return;
    try {
      const res = await sendMutation.mutateAsync({
        sessionId: selectedSessionId || null,
        userMessage: text,
        focusArea: selectedSessionId ? undefined : draftFocus,
      });
      const newSid = res?.session_id || res?.data?.session_id;
      if (newSid && newSid !== selectedSessionId) {
        setSelectedSessionId(newSid);
      }
      setDraftInput('');
    } catch (err) {
      toast.error(err?.message || 'Coach request failed');
    }
  };

  const handleStarterClick = (text) => {
    setDraftInput(text);
  };

  const handleCreate = async ({ title, focusArea }) => {
    try {
      const session = await createMutation.mutateAsync({ title, focusArea });
      setSelectedSessionId(session.id);
      setDraftFocus(focusArea || 'general');
    } catch (err) {
      toast.error(err?.message || 'Failed to create session');
    }
  };

  const handleArchive = async (session) => {
    try {
      await archiveMutation.mutateAsync({ sessionId: session.id, archive: !session.is_archived });
      if (session.id === selectedSessionId && !session.is_archived) {
        setSelectedSessionId(null);
      }
      toast.success(session.is_archived ? 'Session unarchived' : 'Session archived');
    } catch (err) {
      toast.error(err?.message || 'Archive failed');
    }
  };

  const handleRename = async (title) => {
    if (!selectedSessionId) return;
    try {
      await renameMutation.mutateAsync({ sessionId: selectedSessionId, title });
      toast.success('Session renamed');
    } catch (err) {
      toast.error(err?.message || 'Rename failed');
    }
  };

  /* -- Derived subtitle -- */
  const activeCount = sessions.filter((s) => !s.is_archived).length;
  const subtitle = `${activeCount} active session${activeCount === 1 ? '' : 's'}`;

  /* -- Render -- */
  return (
    <div className="animate-slide-up flex flex-col h-full min-h-0">
      <PageHeader title="AI Coach" subtitle={subtitle} />

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 h-[calc(100vh-13rem)]">
        {/* Sidebar */}
        <div className="w-full md:w-[300px] flex-shrink-0 min-h-0 h-64 md:h-auto">
          <SessionSidebar
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            onSelect={setSelectedSessionId}
            onCreate={handleCreate}
            onArchive={handleArchive}
            isCreating={createMutation.isPending}
            isLoading={sessionsLoading}
          />
        </div>

        {/* Chat pane */}
        <div className="flex-1 min-h-0">
          <ChatPane
            session={selectedSession}
            messages={messages}
            isMessagesLoading={messagesLoading && !!selectedSessionId}
            isSending={sendMutation.isPending}
            onRename={handleRename}
            isRenaming={renameMutation.isPending}
            onStarterClick={handleStarterClick}
            onShowContext={setContextMessage}
          >
            <MessageInput
              value={draftInput}
              onChange={setDraftInput}
              onSend={handleSend}
              isPending={sendMutation.isPending}
              placeholder={
                selectedSession
                  ? 'Reply to your coach...'
                  : `Start a ${effectiveFocus} conversation...`
              }
            />
          </ChatPane>
        </div>
      </div>

      <ContextSnapshotInspector
        message={contextMessage}
        onClose={() => setContextMessage(null)}
      />
    </div>
  );
}
