import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { renderMarkdown } from '../../utils/markdown';
import { VersionDiffView } from './VersionDiffView';

interface VersionHistoryModalProps {
  noteId: string;
  onClose: () => void;
}

interface GitCommit {
  hash: string;
  date: string;
  message: string;
}

type ContentMode = 'markdown' | 'text';

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ noteId, onClose }) => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<GitCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<string>('');
  const [contentMode, setContentMode] = useState<ContentMode>('markdown');
  const [diff, setDiff] = useState<string>('');
  const [showDiff, setShowDiff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [noteId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/notes/${noteId}/history`);
      if (res.data.success) {
        setHistory(res.data.history || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
      setError('加载历史失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCommitContent = async (hash: string) => {
    try {
      const res = await api.get(`/notes/${noteId}/content/${hash}`);
      if (res.data.success) {
        setSelectedCommit(hash);
        setSelectedContent(res.data.content);
        setShowDiff(false);
        setContentMode('markdown');
      }
    } catch (err) {
      console.error('Failed to load commit content:', err);
      setError('加载版本内容失败');
    }
  };

  const loadDiff = async (hash: string) => {
    try {
      const res = await api.get(`/notes/${noteId}/diff/${hash}`);
      if (res.data.success) {
        setSelectedCommit(hash);
        setDiff(res.data.diff);
        setShowDiff(true);
      }
    } catch (err) {
      console.error('Failed to load diff:', err);
      setError('加载差异对比失败');
    }
  };

  const handleRestore = async () => {
    if (!selectedCommit || !selectedContent) return;
    if (!window.confirm('确定要将当前笔记恢复为这个历史版本吗？恢复后当前内容会被覆盖。')) return;

    try {
      setRestoring(true);
      // 获取当前笔记的元数据
      const res = await api.get(`/notes/${noteId}`);
      if (res.data.success) {
        const note = res.data.note;
        // 更新笔记内容
        await api.put(`/notes/${noteId}`, {
          category: note.category,
          title: note.title,
          content: selectedContent,
          room: note.room,
          rooms: note.rooms,
          tags: note.tags,
          progress: note.progress,
          budget: note.budget,
          actualCost: note.actualCost,
        });
        alert('恢复成功！页面将刷新');
        onClose();
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to restore:', err);
      alert('恢复失败');
    } finally {
      setRestoring(false);
    }
  };

  const handleCreateNew = () => {
    if (!selectedContent) return;
    // 跳转到新建笔记页面，内容会通过history state传递
    navigate('/edit/new', { state: { content: selectedContent, title: `复制于历史版本 - ${new Date().toLocaleDateString()}` } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">修改历史</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无修改历史（需要git仓库才能使用版本历史功能）
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(commit => (
                <div
                  key={commit.hash}
                  className={`p-3 border rounded-lg transition-colors ${
                    selectedCommit === commit.hash ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-mono text-gray-500">{commit.hash.slice(0, 7)}</div>
                    <div className="text-xs text-gray-400">{commit.date.split(' ')[0]}</div>
                  </div>
                  <div className="mt-1 text-sm">{commit.message}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => loadCommitContent(commit.hash)}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      查看内容
                    </button>
                    <button
                      onClick={() => loadDiff(commit.hash)}
                      className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                    >
                      对比当前
                    </button>
                  </div>

                  {selectedCommit === commit.hash && selectedContent && !showDiff && (
                    <div className="mt-3 border rounded-lg overflow-hidden">
                      {/* 模式切换 tabs */}
                      <div className="flex border-b bg-gray-50">
                        <button
                          onClick={() => setContentMode('markdown')}
                          className={`px-3 py-2 text-xs font-medium ${
                            contentMode === 'markdown'
                              ? 'bg-white text-blue-600 border-b border-white -mb-px'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          渲染预览
                        </button>
                        <button
                          onClick={() => setContentMode('text')}
                          className={`px-3 py-2 text-xs font-medium ${
                            contentMode === 'text'
                              ? 'bg-white text-blue-600 border-b border-white -mb-px'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          查看源码
                        </button>
                      </div>
                      {/* 内容显示 */}
                      <div className="p-3 bg-white max-h-60 overflow-y-auto">
                        {contentMode === 'markdown' ? (
                          <div
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedContent) }}
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">{selectedContent || '(空内容)'}</pre>
                        )}
                      </div>
                      {/* 操作按钮 */}
                      <div className="flex border-t bg-gray-50 p-2 gap-2">
                        <button
                          onClick={handleRestore}
                          disabled={restoring}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 rounded transition-colors disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {restoring ? '恢复中...' : '恢复此版本'}
                        </button>
                        <button
                          onClick={handleCreateNew}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          新建笔记
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedCommit === commit.hash && diff && showDiff && (
                    <VersionDiffView diff={diff} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryModal;
