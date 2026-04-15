import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router';
import { useAuth } from './hooks/useAuth';
import PinGate from './components/auth/PinGate';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/ui/ErrorBoundary';

const ProjectsHome = lazy(() => import('./pages/ProjectsHome'));
const ProjectDashboard = lazy(() => import('./pages/ProjectDashboard'));
const NicheResearch = lazy(() => import('./pages/NicheResearch'));
const TopicReview = lazy(() => import('./pages/TopicReview'));
const TopicDetail = lazy(() => import('./pages/TopicDetail'));
const ScriptReview = lazy(() => import('./pages/ScriptReview'));
const VideoReview = lazy(() => import('./pages/VideoReview'));
const ProductionMonitor = lazy(() => import('./pages/ProductionMonitor'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const Research = lazy(() => import('./pages/Research'));
const YouTubeDiscovery = lazy(() => import('./pages/YouTubeDiscovery'));
const VideoAnalysis = lazy(() => import('./pages/VideoAnalysis'));
const ShortsCreator = lazy(() => import('./pages/ShortsCreator'));
const SocialPublisher = lazy(() => import('./pages/SocialPublisher'));
const ContentCalendar = lazy(() => import('./pages/ContentCalendar'));
const EngagementHub = lazy(() => import('./pages/EngagementHub'));
const Keywords = lazy(() => import('./pages/Keywords'));
const IntelligenceHub = lazy(() => import('./pages/IntelligenceHub'));

const PageFallback = (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-6 h-6 border-2 border-slate-300 dark:border-slate-600 border-t-primary dark:border-t-blue-400 rounded-full animate-spin" />
  </div>
);

export default function App() {
  const { isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <PinGate onLogin={login} />;
  }

  return (
    <ErrorBoundary>
      <AppLayout onLogout={logout}>
        <Suspense fallback={PageFallback}>
          <Routes>
            <Route path="/" element={<ProjectsHome />} />
            <Route path="/project/:id" element={<ProjectDashboard />} />
            <Route path="/project/:id/research" element={<NicheResearch />} />
            <Route path="/project/:id/topics" element={<TopicReview />} />
            <Route path="/project/:id/keywords" element={<Keywords />} />
            <Route path="/project/:id/intelligence" element={<IntelligenceHub />} />
            <Route path="/project/:id/topics/:topicId" element={<TopicDetail />} />
            <Route path="/project/:id/topics/:topicId/script" element={<ScriptReview />} />
            <Route path="/project/:id/topics/:topicId/review" element={<VideoReview />} />
            <Route path="/project/:id/production" element={<ProductionMonitor />} />
            <Route path="/project/:id/analytics" element={<Analytics />} />
            <Route path="/project/:id/calendar" element={<ContentCalendar />} />
            <Route path="/project/:id/engagement" element={<EngagementHub />} />
            <Route path="/research" element={<Research />} />
            <Route path="/youtube-discovery" element={<YouTubeDiscovery />} />
            <Route path="/youtube-discovery/analysis/:analysisId" element={<VideoAnalysis />} />
            <Route path="/shorts" element={<ShortsCreator />} />
            <Route path="/social" element={<SocialPublisher />} />
            <Route path="/project/:id/settings" element={<Settings />} />
          </Routes>
        </Suspense>
      </AppLayout>
    </ErrorBoundary>
  );
}
