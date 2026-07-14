import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Library from '@/pages/Library';
import Chat from '@/pages/Chat';
import Profile from '@/pages/Profile';
import SpaceView from '@/pages/SpaceView';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-[#8e9192]">
        <span className="text-[14px]">loading...</span>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/chat"
        element={
          <Protected>
            <Chat />
          </Protected>
        }
      />

      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="spaces" element={<Library />} />
        <Route path="spaces/:spaceId" element={<SpaceView />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
