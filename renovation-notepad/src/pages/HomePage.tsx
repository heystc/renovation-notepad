import React, { useState, useEffect } from 'react';
import { Plus, Search, Settings as SettingsIcon, DollarSign, LogOut, FileUp, Filter, LayoutGrid, CheckCircle, Home, NotebookPen } from 'lucide-react';
import type { Note, Settings, ViewMode } from '../types';
import { DEFAULT_SETTINGS, MOCK_NOTES, MOCK_EXPENSES } from '../constants/defaultData';
import { getRoomIcon, getStatusIcon } from '../utils/icons';
import api from '../utils/api';
import NoteCard from '../components/notes/NoteCard';
import AddNoteModal from '../components/notes/AddNoteModal';
import SettingsModal from '../components/settings/SettingsModal';
import BudgetSummary from '../components/budget/BudgetSummary';

interface HomePageProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  setIsImportModalOpen: (open: boolean) => void;
  currentUser: string;
  isCurrentUserAdmin: boolean;
  onLogout: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  isSettingsModalOpen,
  setIsSettingsModalOpen,
  setIsImportModalOpen,
  currentUser,
  isCurrentUserAdmin,
  onLogout,
}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [expenses] = useState(MOCK_EXPENSES);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeRooms, setActiveRooms] = useState<string[]>([]);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.success) {
        setSettings(res.data.settings);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
      setSettings(DEFAULT_SETTINGS);
    }
  };

  const loadNotes = async () => {
    try {
      const res = await api.get('/notes');
      if (res.data.success) {
        setNotes(res.data.notes);
      }
    } catch (error) {
      console.error('加载笔记失败:', error);
      setNotes(MOCK_NOTES);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSettings = async (newSettings: Settings) => {
    try {
      const res = await api.put('/settings', newSettings);
      if (res.data.success) {
        setSettings(res.data.settings);
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      setSettings(newSettings);
    }
  };

  const handleAddNote = async (newNote: Note) => {
    try {
      const res = await api.post('/notes', {
        category: newNote.category,
        title: newNote.title,
        content: newNote.content,
        room: newNote.room,
        progress: newNote.progress,
        budget: newNote.budget,
        actualCost: newNote.actualCost,
      });
      if (res.data.success) {
        await loadNotes();
      }
    } catch (error) {
      console.error('添加笔记失败:', error);
      const noteToAdd: Note = {
        ...newNote,
        id: Date.now().toString(),
      };
      setNotes([noteToAdd, ...notes]);
    }
  };

  const handleTogglePin = (id: string) => {
    const updatedNotes = notes.map(note =>
      note.id === id ? { ...note, isPinned: !note.isPinned } : note
    );
    setNotes(updatedNotes);
    api.put(`/notes/${id}`, { isPinned: updatedNotes.find(n => n.id === id)?.isPinned }).catch(err => console.error(err));
  };

  const handleUpdateStatus = (id: string, status: string) => {
    const updatedNotes = notes.map(note =>
      note.id === id ? { ...note, progress: status } : note
    );
    setNotes(updatedNotes);
    api.put(`/notes/${id}`, { progress: status }).catch(err => console.error(err));
  };

  const handleRoomToggle = (roomId: string) => {
    setActiveRooms(prev =>
      prev.includes(roomId) ? prev.filter(r => r !== roomId) : [...prev, roomId]
    );
  };

  const handleStatusToggle = (statusId: string) => {
    setActiveStatus(activeStatus === statusId ? null : statusId);
  };

  const handleBatchImport = async (files: FileList) => {
    const importData: Array<{ title: string; content: string; category: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.endsWith('.md')) continue;

      const content = await file.text();
      let title = file.name.replace('.md', '');
      let noteContent = content;

      const titleMatch = content.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        title = titleMatch[1];
        noteContent = content.replace(/^#\s+.+\n/, '');
      }

      importData.push({ title, content: noteContent, category: 'idea' });
    }

    for (const item of importData) {
      try {
        await api.post('/notes', {
          title: item.title,
          content: item.content,
          category: item.category,
          date: new Date().toISOString().split('T')[0],
        });
      } catch (error) {
        console.error('导入失败:', item.title, error);
      }
    }

    await loadNotes();
    setIsImportModalOpen(false);
    alert(`成功导入 ${importData.length} 个文件`);
  };

  const filteredNotes = notes.filter(note => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    if (activeCategory && note.category !== activeCategory) return false;
    if (activeRooms.length > 0) {
      const noteRooms = note.rooms || (note.room ? [note.room] : []);
      if (!noteRooms.some(r => activeRooms.includes(r))) return false;
    }
    if (activeStatus && note.progress !== activeStatus) return false;
    return true;
  }).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return b.id.localeCompare(a.id);
  });

  useEffect(() => {
    loadSettings();
    loadNotes();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 - 单行布局 */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 py-2 sm:py-0 sm:h-16 sm:items-center">
            {/* Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                <NotebookPen className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">装修记事本</h1>
            </div>

            {/* 搜索框 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="home-search-input"
                type="text"
                placeholder="搜索笔记..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                name="search"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 右侧操作区 */}
            <div className="flex items-center gap-2 flex-shrink-0 pb-2 sm:pb-0">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('notes')}
                  className={cn(
                    "px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                    viewMode === 'notes' ? "bg-white shadow-sm text-gray-900" : "text-gray-600"
                  )}
                >
                  <FileUp className="w-4 h-4" />
                  <span className="hidden sm:inline">笔记</span>
                </button>
                <button
                  onClick={() => setViewMode('budget')}
                  className={cn(
                    "px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                    viewMode === 'budget' ? "bg-white shadow-sm text-gray-900" : "text-gray-600"
                  )}
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="hidden sm:inline">预算</span>
                </button>
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">新建笔记</span>
              </button>


              <label className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="批量导入">
                <FileUp className="w-5 h-5" />
                <input
                  type="file"
                  accept=".md"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleBatchImport(e.target.files)}
                />
              </label>

              <div className="w-px h-6 bg-gray-200 hidden sm:block" />
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="设置"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-gray-200" />
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                <span className="text-sm text-gray-600">{currentUser}</span>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                title="退出登录"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {viewMode === 'budget' ? (
          <div>
            <BudgetSummary expenses={expenses} />
            {/* 这里可以扩展预算表格 */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">预算明细</h2>
              <p className="text-gray-500">预算管理功能开发中...</p>
            </div>
          </div>
        ) : (
          <div>
            {/* 筛选器 */}
            {(settings.categories.length > 1 || settings.rooms.length > 0 || settings.statuses.length > 0) && (
              <div className="mb-6">
                <button
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  className="mb-2 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <Filter className="w-4 h-4" />
                  {isFiltersOpen ? '收起筛选' : '显示筛选'}
                </button>
                {isFiltersOpen && (
                  <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                    {settings.categories.length > 1 && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setActiveCategory(null)}
                          className={cn(
                            "px-3 py-1 rounded-full text-sm border transition-colors flex items-center gap-1",
                            activeCategory === null
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white border-gray-200 text-gray-600 hover:border-blue-200"
                          )}
                        >
                          <LayoutGrid className="w-4 h-4" />
                          全部分类
                        </button>
                        {settings.categories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={cn(
                              "px-3 py-1 rounded-full text-sm border transition-colors",
                              activeCategory === cat.id
                                ? `${cat.color} border-transparent`
                                : "bg-white border-gray-200 text-gray-600 hover:border-blue-200"
                            )}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {settings.rooms.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setActiveRooms([])}
                          className={cn(
                            "px-3 py-1 rounded-full text-sm border transition-colors flex items-center gap-1",
                            activeRooms.length === 0
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white border-gray-200 text-gray-600 hover:border-blue-200"
                          )}
                        >
                          <Home className="w-4 h-4" />
                          全部房间
                        </button>
                        {settings.rooms.map(room => (
                          <button
                            key={room.id}
                            onClick={() => handleRoomToggle(room.id)}
                            className={cn(
                              "px-3 py-1 rounded-full text-sm border transition-colors flex items-center gap-1",
                              activeRooms.includes(room.id)
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white border-gray-200 text-gray-600 hover:border-blue-200"
                            )}
                          >
                            {getRoomIcon(room.icon)}
                            {room.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {settings.statuses.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setActiveStatus(null)}
                          className={cn(
                            "px-3 py-1 rounded-full text-sm border transition-colors flex items-center gap-1",
                            activeStatus === null
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white border-gray-200 text-gray-600 hover:border-blue-200"
                          )}
                        >
                          <CheckCircle className="w-4 h-4" />
                          全部状态
                        </button>
                        {settings.statuses.map(status => (
                          <button
                            key={status.id}
                            onClick={() => handleStatusToggle(status.id)}
                            className={cn(
                              "px-3 py-1 rounded-full text-sm border transition-colors flex items-center gap-1",
                              activeStatus === status.id
                                ? `${status.color} border-transparent`
                                : "bg-white border-gray-200 text-gray-600 hover:border-blue-200"
                            )}
                          >
                            {getStatusIcon(status.icon)}
                            {status.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-12 text-gray-500">加载中...</div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">暂无笔记，点击右上角"新建笔记"开始记录吧</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    settings={settings}
                    onTogglePin={handleTogglePin}
                    onUpdateStatus={handleUpdateStatus}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <AddNoteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddNote}
        settings={settings}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdate={handleUpdateSettings}
        currentUser={currentUser}
        isCurrentUserAdmin={isCurrentUserAdmin}
      />
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default HomePage;
