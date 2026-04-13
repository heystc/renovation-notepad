import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Note, Settings } from '../../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getRoomIcon } from '../../utils/icons';
import MarkdownEditor from '../editor/MarkdownEditor';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (n: Note) => Promise<void>;
  settings: Settings;
}

export const AddNoteModal: React.FC<AddNoteModalProps> = ({ isOpen, onClose, onAdd, settings }) => {
  const [category, setCategory] = useState<string>(settings.categories[0].id);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [progress, setProgress] = useState<string>(settings.statuses[0].id);
  const [budget, setBudget] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCategory(settings.categories[0].id);
      setProgress(settings.statuses[0].id);
      setTags([]);
    }
  }, [isOpen, settings]);

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
      await onAdd({
        id: '',
        category,
        title,
        content,
        date: new Date().toISOString().split('T')[0],
        // 向后兼容同时发送新旧字段
        rooms: tags.length > 0 ? tags : undefined,
        room: tags.length > 0 ? tags[0] : undefined,
        tags: tags.length > 0 ? tags : undefined,
        tag: tags.length > 0 ? tags[0] : undefined,
        progress,
        budget: budget ? Number(budget) : undefined,
        actualCost: actualCost ? Number(actualCost) : undefined,
      });
      setTitle('');
      setContent('');
      setTags([]);
      setProgress(settings.statuses[0].id);
      setBudget('');
      setActualCost('');
      onClose();
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 className="font-semibold text-lg">新建笔记</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors active:bg-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <div className="flex flex-wrap gap-2">
              {settings.categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={cn(
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
            <div className="p-3 border border-gray-200 rounded-lg max-h-48 overflow-y-auto space-y-3">
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
                            {getRoomIcon(tag.icon)}
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
                        {getRoomIcon(r.icon)}
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
                  className={cn(
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

          <button
            type="submit"
            disabled={isSaving || !title.trim()}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
          >
            {isSaving ? '保存中...' : '保存笔记'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddNoteModal;
