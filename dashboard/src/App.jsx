import { Routes, Route } from 'react-router';
import { useAuth } from './hooks/useAuth';
import PinGate from './components/auth/PinGate';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/ui/ErrorBoundary';
import ProjectsHome from './pages/ProjectsHome';
import ProjectDashboard from './pages/ProjectDashboard';
import NicheResearch from './pages/NicheResearch';
import TopicReview from './pages/TopicReview';
import ScriptReview from './pages/ScriptReview';
import ProductionMonitor from './pages/ProductionMonitor';
import Analytics from './pages/Analytics';
import VideoReview from './pages/VideoReview';
import Settings from './pages/Settings';
import TopicDetail from './pages/TopicDetail';

export default function App() {
  const { isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <PinGate onLogin={login} />;
  }

  return (
    <ErrorBoundary>
      <AppLayout onLogout={logout}>
        <Routes>
          <Route path="/" element={<ProjectsHome />} />
          <Route path="/project/:id" element={<ProjectDashboard />} />
          <Route path="/project/:id/research" element={<NicheResearch />} />
          <Route path="/project/:id/topics" element={<TopicReview />} />
          <Route path="/project/:id/topics/:topicId" element={<TopicDetail />} />
          <Route path="/project/:id/topics/:topicId/script" element={<ScriptReview />} />
          <Route path="/project/:id/topics/:topicId/review" element={<VideoReview />} />
          <Route path="/project/:id/production" element={<ProductionMonitor />} />
          <Route path="/project/:id/analytics" element={<Analytics />} />
          <Route path="/project/:id/settings" element={<Settings />} />
        </Routes>
      </AppLayout>
    </ErrorBoundary>
  );
}
