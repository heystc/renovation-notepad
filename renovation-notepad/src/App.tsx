import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Import types and constants
import type { User, ViewMode } from './types';
import api from './utils/api';

// Import pages
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import CreateNotePage from './pages/CreateNotePage';
import NoteDetailPage from './pages/NoteDetailPage';
import SettingsPage from './pages/SettingsPage';

// Utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [_, setIsImportModalOpen] = useState(false);

  // Check for existing auth
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Verify token by getting current user
      api.get('/me').then(res => {
        if (res.data.success) {
          setUser({
            username: res.data.username,
            isAdmin: res.data.isAdmin,
          });
        }
      }).catch(() => {
        localStorage.removeItem('auth_token');
      }).finally(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = (username: string, isAdmin: boolean) => {
    setUser({ username, isAdmin });
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomePage
            viewMode={viewMode}
            setViewMode={setViewMode}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isSettingsModalOpen={isSettingsModalOpen}
            setIsSettingsModalOpen={setIsSettingsModalOpen}
            setIsImportModalOpen={setIsImportModalOpen}
            currentUser={user.username}
            isCurrentUserAdmin={user.isAdmin}
            onLogout={handleLogout}
          />
        }
      />
      <Route path="/create" element={<CreateNotePage />} />
      <Route path="/note/:id" element={<NoteDetailPage />} />
      <Route path="/edit/:id" element={<CreateNotePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
