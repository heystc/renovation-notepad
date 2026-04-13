import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, DollarSign, Edit, History } from 'lucide-react';
import type { Note, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../constants/defaultData';
import { renderMarkdown } from '../utils/markdown';
import api from '../utils/api';
import { CategoryBadge } from '../components/badges/CategoryBadge';
import { TagBadge } from '../components/badges/TagBadge';
import { ProgressBadge } from '../components/badges/ProgressBadge';
import { VersionHistoryModal } from '../components/version/VersionHistoryModal';

export const NoteDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const loadNote = async () => {
    try {
      const res = await api.get(`/notes/${id}`);
      if (res.data.success) {
        setNote(res.data.note);
      }
    } catch (error) {
      console.error('加载笔记失败:', error);
      alert('加载笔记失败');
      navigate('/');
    }
  };

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

  useEffect(() => {
    if (id) {
      loadNote();
      loadSettings();
      setIsLoading(false);
    }
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这篇笔记吗？')) return;
    try {
      await api.delete(`/notes/${id}`);
      navigate('/');
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">笔记不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Link
                to="/"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900 truncate max-w-[300px]">
                {note.title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistoryModal(true)}
                className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                title="修改历史"
              >
                <History className="w-5 h-5" />
              </button>
              <Link
                to={`/edit/${note.id}`}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="编辑"
              >
                <Edit className="w-5 h-5" />
              </Link>
              <button
                onClick={handleDelete}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="删除"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
          {/* 标签栏 */}
          <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-gray-100">
            <CategoryBadge category={note.category} categories={settings.categories} />
            {(note.tags || note.rooms || (note.tag || note.room ? [note.tag || note.room] : [])).filter(Boolean).map(tagId => (
              <TagBadge key={tagId} tagId={tagId as string} settings={settings} />
            ))}
            {note.progress && <ProgressBadge status={note.progress} statuses={settings.statuses} />}
            {(note.budget || note.actualCost) && (
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                <DollarSign className="w-3 h-3" />
                <span>预算: ¥{note.budget?.toLocaleString()}</span>
                {note.actualCost && note.actualCost > 0 && (
                  <span className={note.actualCost > note.budget! ? 'text-red-500' : 'text-green-500'}>
                    / 实际: ¥{note.actualCost.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 内容 */}
          <div
            dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }}
          />

          {/* 底部信息 */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-sm text-gray-400">
            创建于 {note.date}
            {note.updatedAt && note.updatedAt !== note.date && ` · 更新于 ${note.updatedAt}`}
          </div>
        </div>
      </main>

      {/* 悬浮编辑按钮 */}
      <div className="fixed bottom-6 right-6 z-50">
        <Link
          to={`/edit/${note.id}`}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:shadow-xl active:scale-95"
        >
          <Edit className="w-5 h-5" />
          <span className="font-medium">编辑笔记</span>
        </Link>
      </div>

      {/* 版本历史弹窗 */}
      {showHistoryModal && (
        <VersionHistoryModal noteId={note.id} onClose={() => setShowHistoryModal(false)} />
      )}
    </div>
  );
};

export default NoteDetailPage;
