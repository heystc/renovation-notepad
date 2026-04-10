import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Import types and constants
import type { ViewMode } from './types';

// Import pages
import HomePage from './pages/HomePage';
import CreateNotePage from './pages/CreateNotePage';
import NoteDetailPage from './pages/NoteDetailPage';

// Utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleLogout = () => {
    // No-op in standalone version
  };

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
            currentUser="user"
            isCurrentUserAdmin={true}
            onLogout={handleLogout}
          />
        }
      />
      <Route path="/create" element={<CreateNotePage />} />
      <Route path="/note/:id" element={<NoteDetailPage />} />
      <Route path="/edit/:id" element={<CreateNotePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
