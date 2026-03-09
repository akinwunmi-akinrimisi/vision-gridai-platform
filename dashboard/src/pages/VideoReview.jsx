import { useParams } from 'react-router';
import { useVideoReview } from '../hooks/useVideoReview';

/**
 * VideoReview — Gate 3 video review and publish page.
 * Stub page for Phase 5 Wave 0.
 */
export default function VideoReview() {
  const { id, topicId } = useParams();
  const { topic, scenes, isLoading, error } = useVideoReview(topicId);

  return (
    <div data-testid="video-review-page">
      <p>VideoReview placeholder</p>
    </div>
  );
}
