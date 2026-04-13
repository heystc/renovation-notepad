import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Home, Sofa, Utensils, Bath, Bed, BookOpen, User, Flower2 } from 'lucide-react';
import type { Settings, Note } from '../types';
import { DEFAULT_SETTINGS } from '../constants/defaultData';
import api from '../utils/api';
import MarkdownEditor from '../components/editor/MarkdownEditor';

export const CreateNotePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = !!id && id !== 'new';
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [category, setCategory] = useState<string>(DEFAULT_SETTINGS.categories[0].id);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // 从location state获取默认内容（从版本历史新建笔记）
  useEffect(() => {
    if (location.state?.content) {
      setContent(location.state.content);
    }
    if (location.state?.title) {
      setTitle(location.state.title);
    }
  }, [location]);
  const [tags, setTags] = useState<string[]>([]);
  const [progress, setProgress] = useState<string>(DEFAULT_SETTINGS.statuses[0].id);
  const [budget, setBudget] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 显示toast消息，自动消失
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage('');
    }, 3000);
  };

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
        // 收集标签，过滤掉undefined，保证都是string类型
        const loadedTags = note.tags || note.rooms || (note.tag || note.room ? [note.tag || note.room].filter((t): t is string => !!t) : []);
        setTags(loadedTags.filter((t): t is string => !!t));
        setProgress(note.progress || settings.statuses[0]?.id || '');
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

  const toggleTag = (tagId: string) => {
    setTags(prev =>
      prev.includes(tagId) ? prev.filter(r => r !== tagId) : [...prev, tagId]
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
          // 向后兼容：同时发送新旧字段
          rooms: tags.length > 0 ? tags : undefined,
          room: tags.length > 0 ? tags[0] : undefined,
          tags: tags.length > 0 ? tags : undefined,
          tag: tags.length > 0 ? tags[0] : undefined,
          progress,
          budget: budget ? Number(budget) : undefined,
          actualCost: actualCost ? Number(actualCost) : undefined,
        });
        if (res.data.success) {
          // 保存成功后留在编辑页面，允许继续编辑
          showToast('保存成功');
        }
      } else {
        const res = await api.post('/notes', {
          category,
          title,
          content,
          // 向后兼容：同时发送新旧字段
          rooms: tags.length > 0 ? tags : undefined,
          room: tags.length > 0 ? tags[0] : undefined,
          tags: tags.length > 0 ? tags : undefined,
          tag: tags.length > 0 ? tags[0] : undefined,
          progress,
          budget: budget ? Number(budget) : undefined,
          actualCost: actualCost ? Number(actualCost) : undefined,
        });
        if (res.data.success) {
          // 新建保存成功后跳转到编辑该笔记页面，继续编辑
          navigate(`/edit/${res.data.note.id}`);
        }
      }
    } catch (error) {
      console.error('保存失败:', error);
      showToast('保存失败，请重试');
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
            <div className="p-3 border border-gray-200 rounded-lg max-h-64 overflow-y-auto space-y-3">
              {/* 如果有tagGroups，按分组显示 */}
              {settings.tagGroups && settings.tagGroups.length > 0 ? (
                settings.tagGroups.map(group => (
                  <div key={group.id} className="space-y-1">
                    {settings.tagGroups.length > 1 && (
                      <div className="text-xs font-medium text-gray-500 px-1">{group.name}</div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                      {group.tags.map(tag => (
                        <label key={tag.id} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={tags.includes(tag.id)}
                            onChange={() => toggleTag(tag.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <span className="text-sm flex items-center gap-1 truncate">
                            {getRoomIconInline(tag.icon)}
                            {tag.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                // 向后兼容：没有tagGroups时使用旧格式
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                  {(settings.tags || settings.rooms || []).map(r => (
                    <label key={r.id} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={tags.includes(r.id)}
                        onChange={() => toggleTag(r.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className="text-sm flex items-center gap-1 truncate">
                        {getRoomIconInline(r.icon)}
                        {r.label}
                      </span>
                    </label>
                  ))}
                </div>
              )}
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

          <div className="pb-24">
            <MarkdownEditor
              content={content}
              onChange={setContent}
              placeholder="内容 (Markdown)"
            />
          </div>
        </form>

        {/* 悬浮操作按钮 */}
        <div className="fixed bottom-6 left-0 right-0 z-50 px-4">
          <div className="max-w-4xl mx-auto flex gap-3">
            <button
              type="button"
              onClick={() => navigate(isEdit ? `/note/${id}` : '/')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors bg-white shadow-lg"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || !title.trim()}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base shadow-lg"
            >
              {isSaving ? '保存中...' : '保存笔记'}
            </button>
          </div>
        </div>

        {/* Toast消息提醒 */}
        {toastMessage && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl animate-fade-in-out">
            {toastMessage}
          </div>
        )}
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
