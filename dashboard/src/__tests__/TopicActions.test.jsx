import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import TopicCard from '../components/topics/TopicCard';

// Mock react-router
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useParams: () => ({ id: 'test-project-id' }),
    useNavigate: () => vi.fn(),
  };
});

// Mock supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  },
}));

// Mock webhookCall
vi.mock('../lib/api', () => ({
  webhookCall: vi.fn().mockResolvedValue({ success: true }),
}));

const mockTopic = {
  id: 'topic-1',
  project_id: 'test-project-id',
  topic_number: 1,
  seo_title: 'Test Topic Title',
  original_title: 'Test Topic Title',
  narrative_hook: 'This is the narrative hook text',
  key_segments: 'Segment 1\nSegment 2',
  playlist_group: 1,
  playlist_angle: 'The Mathematician',
  review_status: 'pending',
  estimated_cpm: '$35',
  viral_potential: 'High',
  script_review_status: 'pending',
  status: 'pending',
  avatars: [
    {
      avatar_name_age: 'Marcus, 34',
      occupation_income: 'Software Engineer, $145K',
      life_stage: 'Young Professional',
      pain_point: 'Wasting money on fees',
      spending_profile: 'High spender',
      knowledge_level: 'Intermediate',
      emotional_driver: 'Validation anxiety',
      online_hangouts: 'Reddit, Twitter',
      objection: 'These reviews are biased',
      dream_outcome: 'Maximize rewards',
    },
  ],
};

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TopicActions — Approve (TOPC-06)', () => {
  it('approve button calls onApprove with the topic', () => {
    const onApprove = vi.fn();
    renderWithProviders(
      <TopicCard
        topic={mockTopic}
        projectId="test-project-id"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onApprove={onApprove}
        onReject={vi.fn()}
        onRefine={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onSaveAvatar={vi.fn()}
      />
    );
    const approveBtn = screen.getByTitle('Approve');
    fireEvent.click(approveBtn);
    expect(onApprove).toHaveBeenCalledWith(mockTopic);
  });
});

describe('TopicActions — Reject (TOPC-07)', () => {
  it('reject button calls onReject with the topic', () => {
    const onReject = vi.fn();
    renderWithProviders(
      <TopicCard
        topic={mockTopic}
        projectId="test-project-id"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onApprove={vi.fn()}
        onReject={onReject}
        onRefine={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onSaveAvatar={vi.fn()}
      />
    );
    const rejectBtn = screen.getByTitle('Reject');
    fireEvent.click(rejectBtn);
    expect(onReject).toHaveBeenCalledWith(mockTopic);
  });
});

describe('TopicActions — Refine (TOPC-08)', () => {
  it('refine button calls onRefine with the topic', () => {
    const onRefine = vi.fn();
    renderWithProviders(
      <TopicCard
        topic={mockTopic}
        projectId="test-project-id"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onRefine={onRefine}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onSaveAvatar={vi.fn()}
      />
    );
    const refineBtn = screen.getByTitle('Refine');
    fireEvent.click(refineBtn);
    expect(onRefine).toHaveBeenCalledWith(mockTopic);
  });
});

describe('TopicActions — Edit (DASH-01 inline edit mode)', () => {
  it('pencil button on non-approved topic enters inline edit mode (shows inputs)', () => {
    renderWithProviders(
      <TopicCard
        topic={mockTopic}
        projectId="test-project-id"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onRefine={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onSaveAvatar={vi.fn()}
      />
    );

    // First expand the card
    const header = screen.getByTestId('topic-card-1').querySelector('.cursor-pointer');
    fireEvent.click(header);

    // Click pencil/edit button
    const editBtn = screen.getByTitle('Edit');
    fireEvent.click(editBtn);

    // Should show input fields (edit mode)
    expect(screen.getByTestId('edit-seo-title')).toBeInTheDocument();
    expect(screen.getByTestId('edit-narrative-hook')).toBeInTheDocument();
    expect(screen.getByTestId('edit-key-segments')).toBeInTheDocument();
  });

  it('cancel button exits edit mode without calling onSave', () => {
    const onSave = vi.fn();
    renderWithProviders(
      <TopicCard
        topic={mockTopic}
        projectId="test-project-id"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onRefine={vi.fn()}
        onEdit={vi.fn()}
        onSave={onSave}
        onSaveAvatar={vi.fn()}
      />
    );

    // Expand card
    const header = screen.getByTestId('topic-card-1').querySelector('.cursor-pointer');
    fireEvent.click(header);

    // Enter edit mode
    const editBtn = screen.getByTitle('Edit');
    fireEvent.click(editBtn);

    // Click cancel
    const cancelBtn = screen.getByTestId('edit-cancel');
    fireEvent.click(cancelBtn);

    // Should exit edit mode (no save calls)
    expect(onSave).not.toHaveBeenCalled();
    // Should no longer show edit inputs
    expect(screen.queryByTestId('edit-seo-title')).not.toBeInTheDocument();
  });

  it('save button calls onSave and onSaveAvatar with correct fields', async () => {
    const onSave = vi.fn().mockResolvedValue({});
    const onSaveAvatar = vi.fn().mockResolvedValue({});

    renderWithProviders(
      <TopicCard
        topic={mockTopic}
        projectId="test-project-id"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onRefine={vi.fn()}
        onEdit={vi.fn()}
        onSave={onSave}
        onSaveAvatar={onSaveAvatar}
      />
    );

    // Expand card
    const header = screen.getByTestId('topic-card-1').querySelector('.cursor-pointer');
    fireEvent.click(header);

    // Enter edit mode
    const editBtn = screen.getByTitle('Edit');
    fireEvent.click(editBtn);

    // Click save
    const saveBtn = screen.getByTestId('edit-save');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          topic_id: 'topic-1',
          project_id: 'test-project-id',
          fields: expect.objectContaining({ seo_title: expect.any(String) }),
        })
      );
      expect(onSaveAvatar).toHaveBeenCalledWith(
        expect.objectContaining({
          topic_id: 'topic-1',
          project_id: 'test-project-id',
          fields: expect.objectContaining({ avatar_name_age: expect.any(String) }),
        })
      );
    });
  });

  it('edit mode shows Save and Cancel buttons', () => {
    renderWithProviders(
      <TopicCard
        topic={mockTopic}
        projectId="test-project-id"
        isSelected={false}
        onToggleSelect={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onRefine={vi.fn()}
        onEdit={vi.fn()}
        onSave={vi.fn()}
        onSaveAvatar={vi.fn()}
      />
    );

    // Expand card
    const header = screen.getByTestId('topic-card-1').querySelector('.cursor-pointer');
    fireEvent.click(header);

    // Enter edit mode
    const editBtn = screen.getByTitle('Edit');
    fireEvent.click(editBtn);

    // Save and Cancel buttons should be visible
    expect(screen.getByTestId('edit-save')).toBeInTheDocument();
    expect(screen.getByTestId('edit-cancel')).toBeInTheDocument();
  });
});
