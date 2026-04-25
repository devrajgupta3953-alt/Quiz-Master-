/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import QuizEditor from './pages/QuizEditor';
import AdminRoom from './pages/AdminRoom';
import JoinRoom from './pages/JoinRoom';
import ParticipantRoom from './pages/ParticipantRoom';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/room/:code" element={<JoinRoom />} />
      <Route path="/join/:code" element={<JoinRoom />} />
      <Route path="/play/:roomId" element={<ParticipantRoom />} />
      
      {/* Admin Protected Routes */}
      <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
      <Route path="/admin/create" element={<PrivateRoute><QuizEditor /></PrivateRoute>} />
      <Route path="/admin/room/:roomId" element={<PrivateRoute><AdminRoom /></PrivateRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

