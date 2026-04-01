import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import Calendar from './pages/Calendar';
import CreatePost from './pages/CreatePost';
import ReadPost from './pages/ReadPost';
import SpacePage from './pages/SpacePage';
import SharedSpacePage from './pages/SharedSpacePage';
import SettingsProfile from './pages/SettingsProfile';
import SettingsSpaces from './pages/SettingsSpaces';
import SettingsPeople from './pages/SettingsPeople';
import SettingsTags from './pages/SettingsTags';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#666' }}>Loading...</div>;
  if (!user) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const redirect = new URLSearchParams(location.search).get('redirect') || '/';
  if (loading) return null;
  if (user) return <Navigate to={redirect} replace />;
  return children;
}

function AppRoutes() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<ResetPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/" element={
        <ProtectedRoute>
          <Layout onSearch={setSearchQuery}>
            <Home searchQuery={searchQuery} />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/calendar" element={
        <ProtectedRoute>
          <Layout>
            <Calendar />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/create" element={
        <ProtectedRoute>
          <Layout>
            <CreatePost />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/post/:id" element={
        <ProtectedRoute>
          <Layout>
            <ReadPost />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/space/:id" element={
        <ProtectedRoute>
          <Layout>
            <SpacePage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/shared/:shareLink" element={
        <ProtectedRoute>
          <Layout>
            <SharedSpacePage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/settings/profile" element={
        <ProtectedRoute>
          <Layout>
            <SettingsProfile />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/settings/spaces" element={
        <ProtectedRoute>
          <Layout>
            <SettingsSpaces />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/settings/people" element={
        <ProtectedRoute>
          <Layout>
            <SettingsPeople />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/settings/tags" element={
        <ProtectedRoute>
          <Layout>
            <SettingsTags />
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
