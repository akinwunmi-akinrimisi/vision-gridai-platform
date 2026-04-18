import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import TopicRegisterGate from '../components/topics/TopicRegisterGate';

// Mock the webhook module — component imports webhookCall from '../../lib/api'
vi.mock('../lib/api', () => ({
  webhookCall: vi.fn(),
}));

// Mock toast — component uses sonner for success/error notifications
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { webhookCall } from '../lib/api';

const renderGate = (props) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TopicRegisterGate {...props} />
    </QueryClientProvider>
  );
};

const PROJECT_ID = 'proj-1';

const topicWithRecs = (id = 't1', top2Pick = 'REGISTER_05_ARCHIVE', confidence = 0.92) => ({
  id,
  topic_number: 1,
  seo_title: 'Test topic',
  original_title: 'Test topic original',
  review_status: 'pending',
  register_selected_at: null,
  register_recommendations: {
    top_2: [
      { register_id: top2Pick, confidence, reasoning: 'test reason' },
      { register_id: 'REGISTER_01_ECONOMIST', confidence: 0.12, reasoning: 'runner up' },
    ],
  },
});

const approvedTopic = (id = 't2') => ({
  id, topic_number: 2, seo_title: 'Approved', review_status: 'approved',
  register_selected_at: null,
  register_recommendations: { top_2: [{ register_id: 'REGISTER_01_ECONOMIST', confidence: 0.8 }] },
});

const confirmedTopic = (id = 't3') => ({
  id, topic_number: 3, seo_title: 'Confirmed', review_status: 'pending',
  register_selected_at: '2026-04-18T20:00:00Z',
  register_recommendations: { top_2: [{ register_id: 'REGISTER_01_ECONOMIST', confidence: 0.8 }] },
});

const noRecsTopic = (id = 't4') => ({
  id, topic_number: 4, seo_title: 'NoRecs', review_status: 'pending',
  register_selected_at: null,
  register_recommendations: null,
});

describe('TopicRegisterGate — eligibility filter', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('D1: renders null when topics is undefined', () => {
    const { container } = renderGate({ topics: undefined, projectId: PROJECT_ID });
    expect(container.firstChild).toBeNull();
  });

  it('D1b: renders null when topics is empty array', () => {
    const { container } = renderGate({ topics: [], projectId: PROJECT_ID });
    expect(container.firstChild).toBeNull();
  });

  it('D1c: renders null when no topics meet criteria (all confirmed)', () => {
    const { container } = renderGate({ topics: [confirmedTopic()], projectId: PROJECT_ID });
    expect(container.firstChild).toBeNull();
  });

  it('D1d: renders null when topics lack register_recommendations', () => {
    const { container } = renderGate({ topics: [noRecsTopic()], projectId: PROJECT_ID });
    expect(container.firstChild).toBeNull();
  });

  it('D1e: renders null when topics are approved (only pending+unconfirmed qualify)', () => {
    const { container } = renderGate({ topics: [approvedTopic()], projectId: PROJECT_ID });
    expect(container.firstChild).toBeNull();
  });
});

describe('TopicRegisterGate — banner render', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('D2: renders banner with count when eligible topics exist', () => {
    renderGate({ topics: [topicWithRecs('t1'), topicWithRecs('t2'), confirmedTopic()], projectId: PROJECT_ID });
    // Two eligible out of three (confirmed is excluded)
    expect(screen.getByText(/2 topics awaiting register confirmation/i)).toBeInTheDocument();
  });

  it('D2b: singular form when exactly 1 eligible topic', () => {
    renderGate({ topics: [topicWithRecs('t1')], projectId: PROJECT_ID });
    expect(screen.getByText(/1 topic awaiting register confirmation/i)).toBeInTheDocument();
  });

  it('D2c: "Confirm all top picks" button is rendered', () => {
    renderGate({ topics: [topicWithRecs()], projectId: PROJECT_ID });
    expect(screen.getByRole('button', { name: /Confirm all top picks/i })).toBeInTheDocument();
  });
});

describe('TopicRegisterGate — expand / collapse', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('D3: expand toggle reveals per-topic rows', () => {
    renderGate({ topics: [topicWithRecs('t1')], projectId: PROJECT_ID });

    // Initially table is collapsed — topic title not in doc
    expect(screen.queryByText('Test topic')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Review/i }));

    expect(screen.getByText('Test topic')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('D3b: collapse hides rows again', () => {
    renderGate({ topics: [topicWithRecs('t1')], projectId: PROJECT_ID });
    const reviewBtn = screen.getByRole('button', { name: /Review/i });
    fireEvent.click(reviewBtn);
    expect(screen.getByText('Test topic')).toBeInTheDocument();
    fireEvent.click(reviewBtn);
    expect(screen.queryByText('Test topic')).toBeNull();
  });
});

describe('TopicRegisterGate — override dropdown', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('D4: override dropdown lists both top_2 options', () => {
    renderGate({ topics: [topicWithRecs('t1')], projectId: PROJECT_ID });
    fireEvent.click(screen.getByRole('button', { name: /Review/i }));

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    const options = Array.from(select.querySelectorAll('option'));
    expect(options.length).toBe(2);
    // Top pick is Archive (92%), runner-up is Economist (12%)
    expect(options[0].textContent).toMatch(/Archive/i);
    expect(options[0].textContent).toMatch(/92%/);
    expect(options[1].textContent).toMatch(/Economist/i);
    expect(options[1].textContent).toMatch(/12%/);
  });
});

describe('TopicRegisterGate — confirm actions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('D5: Confirm all top picks fires webhookCall for each eligible topic', async () => {
    webhookCall.mockResolvedValue({ success: true, stage: 'topic' });

    renderGate({
      topics: [
        topicWithRecs('t1', 'REGISTER_05_ARCHIVE'),
        topicWithRecs('t2', 'REGISTER_01_ECONOMIST'),
      ],
      projectId: PROJECT_ID,
    });

    fireEvent.click(screen.getByRole('button', { name: /Confirm all top picks/i }));

    await waitFor(() => expect(webhookCall).toHaveBeenCalledTimes(2));
    expect(webhookCall).toHaveBeenCalledWith(
      'register/approve',
      { topic_id: 't1', production_register: 'REGISTER_05_ARCHIVE' },
      expect.objectContaining({ timeoutMs: 20000 })
    );
    expect(webhookCall).toHaveBeenCalledWith(
      'register/approve',
      { topic_id: 't2', production_register: 'REGISTER_01_ECONOMIST' },
      expect.objectContaining({ timeoutMs: 20000 })
    );
  });

  it('D5b: per-row Confirm button fires single webhookCall with auto pick', async () => {
    webhookCall.mockResolvedValue({ success: true, stage: 'topic' });

    renderGate({ topics: [topicWithRecs('t1', 'REGISTER_03_NOIR', 0.88)], projectId: PROJECT_ID });
    fireEvent.click(screen.getByRole('button', { name: /Review/i }));

    const rowConfirm = screen.getByRole('button', { name: /^Confirm$/ });
    fireEvent.click(rowConfirm);

    await waitFor(() => expect(webhookCall).toHaveBeenCalledTimes(1));
    expect(webhookCall).toHaveBeenCalledWith(
      'register/approve',
      { topic_id: 't1', production_register: 'REGISTER_03_NOIR' },
      expect.objectContaining({ timeoutMs: 20000 })
    );
  });

  it('D5c: override dropdown selection overrides top pick in confirm call', async () => {
    webhookCall.mockResolvedValue({ success: true, stage: 'topic' });

    renderGate({ topics: [topicWithRecs('t1', 'REGISTER_05_ARCHIVE')], projectId: PROJECT_ID });
    fireEvent.click(screen.getByRole('button', { name: /Review/i }));

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'REGISTER_01_ECONOMIST' } });

    fireEvent.click(screen.getByRole('button', { name: /^Confirm$/ }));

    await waitFor(() => expect(webhookCall).toHaveBeenCalledTimes(1));
    expect(webhookCall).toHaveBeenCalledWith(
      'register/approve',
      { topic_id: 't1', production_register: 'REGISTER_01_ECONOMIST' },
      expect.objectContaining({ timeoutMs: 20000 })
    );
  });
});
