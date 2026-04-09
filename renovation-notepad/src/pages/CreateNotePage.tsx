import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Home, Sofa, Utensils, Bath, Bed, BookOpen, User, Flower2 } from 'lucide-react';
import type { Settings, Note } from '../types';
import { DEFAULT_SETTINGS } from '../constants/defaultData';
import api from '../utils/api';
import MarkdownEditor from '../components/editor/MarkdownEditor';

export const CreateNotePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [category, setCategory] = useState<string>(DEFAULT_SETTINGS.categories[0].id);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [rooms, setRooms] = useState<string[]>([]);
  const [progress, setProgress] = useState<string>(DEFAULT_SETTINGS.statuses[0].id);
  const [budget, setBudget] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.success) {
        setSettings(res.data.settings);
        if (!isEdit) {
          setCategory(res.data.settings.categories[0].id);
          setProgress(res.data.settings.statuses[0].id);
        }
      }
    } catch (error) {
      console.error('加载设置失败:', error);
      setSettings(DEFAULT_SETTINGS);
    }
  };

  const loadNoteData = async () => {
    if (!isEdit) return;
    try {
      const res = await api.get(`/notes/${id}`);
      if (res.data.success) {
        const note: Note = res.data.note;
        setTitle(note.title);
        setContent(note.content);
        setCategory(note.category);
        setRooms(note.rooms || (note.room ? [note.room] : []));
        setProgress(note.progress);
        setBudget(note.budget ? String(note.budget) : '');
        setActualCost(note.actualCost ? String(note.actualCost) : '');
      }
    } catch (error) {
      console.error('加载笔记失败:', error);
      alert('加载笔记失败');
      navigate('/');
    }
  };

  useEffect(() => {
    loadSettings();
    if (isEdit) {
      loadNoteData();
    }
  }, [id]);

  const toggleRoom = (roomId: string) => {
    setRooms(prev =>
      prev.includes(roomId) ? prev.filter(r => r !== roomId) : [...prev, roomId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      if (isEdit) {
        const res = await api.put(`/notes/${id}`, {
          category,
          title,
          content,
          rooms: rooms.length > 0 ? rooms : undefined,
          room: rooms.length > 0 ? rooms[0] : undefined,
          progress,
          budget: budget ? Number(budget) : undefined,
          actualCost: actualCost ? Number(actualCost) : undefined,
        });
        if (res.data.success) {
          navigate(`/note/${id}`);
        }
      } else {
        const res = await api.post('/notes', {
          category,
          title,
          content,
          rooms: rooms.length > 0 ? rooms : undefined,
          room: rooms.length > 0 ? rooms[0] : undefined,
          progress,
          budget: budget ? Number(budget) : undefined,
          actualCost: actualCost ? Number(actualCost) : undefined,
        });
        if (res.data.success) {
          navigate(`/note/${res.data.note.id}`);
        }
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const clsx = (...inputs: any[]) => {
    return inputs.filter(Boolean).join(' ');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(isEdit ? `/note/${id}` : '/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold">{isEdit ? '编辑笔记' : '新建笔记'}</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex flex-wrap gap-2">
              {settings.categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={clsx(
                    "flex-1 min-w-[70px] py-2 px-3 rounded-lg text-sm font-medium transition-all border",
                    category === cat.id
                      ? "bg-blue-50 border-blue-200 text-blue-600"
                      : "bg-white border-gray-200 text-gray-600 hover:border-blue-200"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm sm:text-base"
              placeholder="标题 *"
            />
          </div>

          <div>
            <div className="p-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {settings.rooms.map(r => (
                  <label key={r.id} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={rooms.includes(r.id)}
                      onChange={() => toggleRoom(r.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-sm flex items-center gap-1 truncate">
                      {/* Need to get room icon here, inline for simplicity */}
                      {getRoomIconInline(r.icon)}
                      {r.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap gap-2">
              {settings.statuses.map((status) => (
                <button
                  key={status.id}
                  type="button"
                  onClick={() => setProgress(status.id)}
                  className={clsx(
                    "flex-1 min-w-[70px] py-2 px-3 rounded-lg text-sm font-medium transition-all border",
                    progress === status.id
                      ? `${status.color} border-transparent`
                      : "bg-white border-gray-200 text-gray-600 hover:border-blue-200"
                  )}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-3 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm sm:text-base"
                placeholder="预算 (元)"
              />
            </div>

            <div>
              <input
                type="number"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                className="w-full px-3 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm sm:text-base"
                placeholder="实际花费 (元)"
              />
            </div>
          </div>

          <div>
            <MarkdownEditor
              content={content}
              onChange={setContent}
              placeholder="内容 (Markdown)"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
            >
              {isSaving ? '保存中...' : '保存笔记'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

// Helper inline
const getRoomIconInline = (iconName: string): React.ReactNode => {
  switch (iconName) {
    case 'sofa': return <Sofa className="w-4 h-4" />;
    case 'utensils': return <Utensils className="w-4 h-4" />;
    case 'bath': return <Bath className="w-4 h-4" />;
    case 'bed': return <Bed className="w-4 h-4" />;
    case 'book': return <BookOpen className="w-4 h-4" />;
    case 'user': return <User className="w-4 h-4" />;
    case 'flower': return <Flower2 className="w-4 h-4" />;
    default: return <Home className="w-4 h-4" />;
  }
};

export default CreateNotePage;
