import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Plus, Search, X, Upload, Pin, CheckCircle2, Clock, AlertCircle,
  Home, Sofa, Utensils, Bath, Bed, BookOpen, User, Flower2, MoreVertical,
  PieChart, DollarSign, Settings, Trash2, Save,
  ArrowLeft, Bold, Italic, List, ListOrdered, Link as LinkIcon,
  FilePen
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface CategoryConfig {
  id: string;
  label: string;
  color: string;
}

interface RoomConfig {
  id: string;
  label: string;
  icon: string;
}

interface StatusConfig {
  id: string;
  label: string;
  color: string;
  icon: string;
}

interface Settings {
  version: string;
  lastModified: string;
  categories: CategoryConfig[];
  rooms: RoomConfig[];
  statuses: StatusConfig[];
}

interface Note {
  id: string;
  category: string;
  title: string;
  content: string;
  isPinned?: boolean;
  date: string;
  room?: string;
  rooms?: string[];
  progress?: string;
  budget?: number;
  actualCost?: number;
}

interface ExpenseItem {
  id: string;
  name: string;
  category: string;
  room?: string;
  budgeted: number;
  actual: number;
  status: 'planned' | 'paid';
  date: string;
}

type ViewMode = 'notes' | 'budget';

// --- Constants ---
const DEFAULT_SETTINGS: Settings = {
  version: '1.0',
  lastModified: new Date().toISOString(),
  categories: [
    { id: 'idea', label: '灵感', color: 'bg-amber-100 text-amber-700' },
    { id: 'product', label: '产品', color: 'bg-blue-100 text-blue-700' },
    { id: 'cost', label: '费用', color: 'bg-green-100 text-green-700' },
    { id: 'file', label: '文件', color: 'bg-purple-100 text-purple-700' },
    { id: 'image', label: '图片', color: 'bg-pink-100 text-pink-700' }
  ],
  rooms: [
    { id: 'living', label: '客厅', icon: 'sofa' },
    { id: 'kitchen', label: '厨房', icon: 'utensils' },
    { id: 'dining', label: '餐厅', icon: 'utensils' },
    { id: 'guest-bath', label: '客卫', icon: 'bath' },
    { id: 'master-bed', label: '主卧', icon: 'bed' },
    { id: 'master-bath', label: '主卫', icon: 'bath' },
    { id: 'study', label: '书房', icon: 'book' },
    { id: 'boy-room', label: '男孩房', icon: 'user' },
    { id: 'girl-room', label: '女孩房', icon: 'user' },
    { id: 'balcony', label: '阳台', icon: 'flower' }
  ],
  statuses: [
    { id: 'todo', label: '待办', color: 'bg-yellow-100 text-yellow-700', icon: 'alert' },
    { id: 'in-progress', label: '进行中', color: 'bg-blue-100 text-blue-700', icon: 'clock' },
    { id: 'done', label: '已完成', color: 'bg-green-100 text-green-700', icon: 'check' }
  ]
};

const MOCK_NOTES: Note[] = [
  {
    id: '1',
    category: 'idea',
    title: '北欧风格电视背景墙设计',
    content: '# 电视背景墙设计\n\n参考了宜家的贝达系列，准备用浅灰色护墙板搭配木质隔板。\n\n## 注意事项\n\n- 插座要预留在电视下方30cm处\n- 预留网线和HDMI线\n- 考虑安装氛围灯',
    isPinned: true,
    date: '2026-04-01',
    room: 'living',
    progress: 'in-progress',
    budget: 5000,
    actualCost: 4800
  },
  {
    id: '2',
    category: 'product',
    title: '马可波罗瓷砖 - 客厅地砖',
    content: '# 马可波罗瓷砖\n\n**型号：** CZ8998AS  \n**尺寸：** 800x800mm  \n**价格：** 128元/块\n\n[购买链接](https://example.com/tiles/marcopolo)',
    date: '2026-03-28',
    room: 'living',
    progress: 'done',
    budget: 8000,
    actualCost: 8200
  }
];

const MOCK_EXPENSES: ExpenseItem[] = [
  { id: '1', name: '客厅地砖', category: '建材', room: 'living', budgeted: 8000, actual: 8200, status: 'paid', date: '2026-03-28' },
  { id: '2', name: '电视背景墙', category: '施工', room: 'living', budgeted: 5000, actual: 4800, status: 'paid', date: '2026-04-01' },
];

// --- API Client ---
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
});

// --- Helper Functions ---
const getRoomIcon = (iconName: string) => {
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

const getStatusIcon = (iconName: string) => {
  switch (iconName) {
    case 'alert': return <AlertCircle className="w-4 h-4" />;
    case 'clock': return <Clock className="w-4 h-4" />;
    case 'check': return <CheckCircle2 className="w-4 h-4" />;
    default: return <AlertCircle className="w-4 h-4" />;
  }
};

// --- Simple Markdown Renderer ---
const renderMarkdown = (md: string) => {
  if (!md) return '';
  let html = md
    .replace(/^### (.*$)/gim, '<h3 style="font-size: 18px; font-weight: 600; margin: 16px 0 8px;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size: 20px; font-weight: 700; margin: 20px 0 10px;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="font-size: 24px; font-weight: 700; margin: 24px 0 12px;">$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/~~(.*?)~~/gim, '<del>$1</del>')
    .replace(/\[([^\]]*)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">$1</a>');

  const lines = html.split('\n');
  let inList = false;
  const processed: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('* ') || line.startsWith('- ')) {
      if (!inList) {
        processed.push('<ul style="margin: 12px 0; padding-left: 24px;">');
        inList = true;
      }
      processed.push(`<li style="margin: 4px 0;">${line.substring(2)}</li>`);
    } else {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      if (line.trim()) {
        processed.push(`<p style="margin: 8px 0; line-height: 1.7;">${line}</p>`);
      }
    }
  }
  if (inList) {
    processed.push('</ul>');
  }

  return processed.join('');
};

// --- Markdown Editor ---
interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const MarkdownEditor = ({ content, onChange, placeholder }: MarkdownEditorProps) => {
  const insertAtCursor = (before: string, after = '') => {
    const textarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
      } else {
        textarea.setSelectionRange(start + before.length, start + before.length);
      }
    }, 0);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border-b border-gray-200">
        <button
          onClick={() => insertAtCursor('**', '**')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="粗体"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => insertAtCursor('*', '*')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="斜体"
        >
          <Italic className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          onClick={() => insertAtCursor('# ')}
          className="p-2 rounded hover:bg-gray-200 transition-colors text-sm font-bold"
          title="标题"
        >
          H1
        </button>
        <button
          onClick={() => insertAtCursor('## ')}
          className="p-2 rounded hover:bg-gray-200 transition-colors text-sm font-bold"
          title="二级标题"
        >
          H2
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          onClick={() => insertAtCursor('- ')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="列表"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => insertAtCursor('1. ')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="有序列表"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          onClick={() => {
            const url = prompt('输入链接地址:');
            if (url) insertAtCursor('[链接文字](', ')');
          }}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="链接"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
      </div>
      <textarea
        id="markdown-editor"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || '开始输入内容...'}
        className="w-full p-4 min-h-[200px] resize-y focus:outline-none"
        style={{ fontFamily: 'Consolas, Monaco, "Courier New", monospace' }}
      />
    </div>
  );
};

// --- Components ---
const Badge = ({ category, categories }: { category: string; categories: CategoryConfig[] }) => {
  const config = categories.find(c => c.id === category) || categories[0];
  return (
    <span className={cn("flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", config.color)}>
      {config.label}
    </span>
  );
};

const ProgressBadge = ({ status, statuses }: { status: string; statuses: StatusConfig[] }) => {
  const config = statuses.find(s => s.id === status) || statuses[0];
  return (
    <span className={cn("flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium", config.color)}>
      {getStatusIcon(config.icon)}
      {config.label}
    </span>
  );
};

const RoomBadge = ({ room, rooms }: { room: string; rooms: RoomConfig[] }) => {
  const config = rooms.find(r => r.id === room) || rooms[0];
  return (
    <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
      {getRoomIcon(config.icon)}
      {config.label}
    </span>
  );
};

interface NoteCardProps {
  note: Note;
  settings: Settings;
  onTogglePin: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

const NoteCard = ({ note, settings, onTogglePin, onUpdateStatus }: NoteCardProps) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Link
      to={`/note/${note.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <div className={cn(
        "bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-all relative cursor-pointer",
        note.isPinned ? "border-amber-300 ring-1 ring-amber-100" : "border-gray-200"
      )}>
        {note.isPinned && (
          <div className="absolute -top-3 -right-1 bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs flex items-center gap-1 shadow-sm">
            <Pin className="w-3 h-3" />
            置顶
          </div>
        )}

        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge category={note.category} categories={settings.categories} />
            {(note.rooms || (note.room ? [note.room] : [])).map(roomId => (
              <RoomBadge key={roomId} room={roomId} rooms={settings.rooms} />
            ))}
          </div>
          <div className="relative" onClick={(e) => e.preventDefault()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>

            {showMenu && (
              <>
                <div className="absolute right-0 top-6 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(note.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Pin className="w-4 h-4" />
                    {note.isPinned ? '取消置顶' : '置顶笔记'}
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  {settings.statuses.map((status) => (
                    <button
                      key={status.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(note.id, status.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      {getStatusIcon(status.icon)}
                      设为{status.label}
                    </button>
                  ))}
                </div>
                <div className="fixed inset-0 z-0" onClick={() => setShowMenu(false)} />
              </>
            )}
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {note.title}
        </h3>
        <p className="text-gray-500 text-sm leading-relaxed mb-3 line-clamp-3">
          {note.content.replace(/[#*_~\[\]]/g, '')}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {note.progress && <ProgressBadge status={note.progress} statuses={settings.statuses} />}
            {(note.budget || note.actualCost) && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
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
          <span className="text-xs text-gray-400">{note.date}</span>
        </div>
      </div>
    </Link>
  );
};

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (n: Note) => Promise<void>;
  settings: Settings;
}

const AddNoteModal = ({ isOpen, onClose, onAdd, settings }: AddNoteModalProps) => {
  const [category, setCategory] = useState<string>(settings.categories[0].id);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [rooms, setRooms] = useState<string[]>([]);
  const [progress, setProgress] = useState<string>(settings.statuses[0].id);
  const [budget, setBudget] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCategory(settings.categories[0].id);
      setProgress(settings.statuses[0].id);
      setRooms([]);
    }
  }, [isOpen, settings]);

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
      await onAdd({
        id: '',
        category,
        title,
        content,
        date: new Date().toISOString().split('T')[0],
        rooms: rooms.length > 0 ? rooms : undefined,
        room: rooms.length > 0 ? rooms[0] : undefined,
        progress,
        budget: budget ? Number(budget) : undefined,
        actualCost: actualCost ? Number(actualCost) : undefined,
      });
      setTitle('');
      setContent('');
      setRooms([]);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 className="font-semibold text-lg">新建笔记</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">分类</label>
            <div className="flex flex-wrap gap-2">
              {settings.categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "flex-1 min-w-[80px] py-2 px-3 rounded-lg text-sm font-medium transition-all border",
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
            <label className="block text-sm font-medium mb-1">标题 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              placeholder="给这个笔记起个名字..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">房间（可多选）</label>
              <div className="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                {settings.rooms.map(r => (
                  <label key={r.id} className="flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={rooms.includes(r.id)}
                      onChange={() => toggleRoom(r.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm flex items-center gap-1">
                      {getRoomIcon(r.icon)}
                      {r.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">进度状态</label>
              <select
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
              >
                {settings.statuses.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">预算 (元)</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                placeholder="预计花费"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">实际花费 (元)</label>
              <input
                type="number"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                placeholder="实际花费"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">内容 (Markdown)</label>
            <MarkdownEditor
              content={content}
              onChange={setContent}
              placeholder="记录你的思路、链接或者价格..."
            />
          </div>

          <button
            type="submit"
            disabled={isSaving || !title.trim()}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? '保存中...' : '保存笔记'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Create Note Page ---
const CreateNotePage = () => {
  const navigate = useNavigate();
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
        setCategory(res.data.settings.categories[0].id);
        setProgress(res.data.settings.statuses[0].id);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
      setSettings(DEFAULT_SETTINGS);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

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
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
                <span>返回</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving || !title.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">新建笔记</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">分类</label>
              <div className="flex flex-wrap gap-2">
                {settings.categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "flex-1 min-w-[80px] py-2 px-3 rounded-lg text-sm font-medium transition-all border",
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
              <label className="block text-sm font-medium mb-1">标题 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                placeholder="给这个笔记起个名字..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">房间（可多选）</label>
                <div className="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                  {settings.rooms.map(r => (
                    <label key={r.id} className="flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={rooms.includes(r.id)}
                        onChange={() => toggleRoom(r.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm flex items-center gap-1">
                        {getRoomIcon(r.icon)}
                        {r.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">进度状态</label>
                <select
                  value={progress}
                  onChange={(e) => setProgress(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                >
                  {settings.statuses.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">预算 (元)</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  placeholder="预计花费"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">实际花费 (元)</label>
                <input
                  type="number"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  placeholder="实际花费"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">内容 (Markdown)</label>
              <MarkdownEditor
                content={content}
                onChange={setContent}
                placeholder="记录你的思路、链接或者价格..."
              />
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

// --- Note Detail Page ---
const NoteDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [rooms, setRooms] = useState<string[]>([]);
  const [progress, setProgress] = useState('');
  const [budget, setBudget] = useState('');
  const [actualCost, setActualCost] = useState('');

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.success) {
        setSettings(res.data.settings);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  const loadNote = async () => {
    try {
      const res = await api.get('/notes');
      if (res.data.success) {
        const foundNote = res.data.notes.find((n: Note) => n.id === id);
        if (foundNote) {
          setNote(foundNote);
          setTitle(foundNote.title);
          setContent(foundNote.content);
          setCategory(foundNote.category);
          setRooms(foundNote.rooms || (foundNote.room ? [foundNote.room] : []));
          setProgress(foundNote.progress || '');
          setBudget(foundNote.budget?.toString() || '');
          setActualCost(foundNote.actualCost?.toString() || '');
        }
      }
    } catch (error) {
      console.error('加载笔记失败:', error);
      const foundNote = MOCK_NOTES.find(n => n.id === id);
      if (foundNote) {
        setNote(foundNote);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRoom = (roomId: string) => {
    setRooms(prev =>
      prev.includes(roomId) ? prev.filter(r => r !== roomId) : [...prev, roomId]
    );
  };

  const handleSave = async () => {
    if (!note || !title.trim()) return;
    setIsSaving(true);
    try {
      const res = await api.put(`/notes/${note.id}`, {
        title,
        content,
        category,
        rooms: rooms.length > 0 ? rooms : undefined,
        room: rooms.length > 0 ? rooms[0] : undefined,
        progress,
        budget: budget ? Number(budget) : undefined,
        actualCost: actualCost ? Number(actualCost) : undefined,
      });
      if (res.data.success) {
        setNote(res.data.note);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('保存失败:', error);
      const updatedNote = {
        ...note,
        title,
        content,
        category,
        rooms: rooms.length > 0 ? rooms : undefined,
        room: rooms.length > 0 ? rooms[0] : undefined,
        progress,
        budget: budget ? Number(budget) : undefined,
        actualCost: actualCost ? Number(actualCost) : undefined,
      };
      setNote(updatedNote);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!note) return;
    if (window.confirm('确定要删除这条笔记吗？')) {
      try {
        await api.delete(`/notes/${note.id}`);
        navigate('/');
      } catch (error) {
        console.error('删除失败:', error);
      }
    }
  };

  const handleTogglePin = async () => {
    if (!note) return;
    const newPinState = !note.isPinned;
    try {
      await api.put(`/notes/${note.id}`, { isPinned: newPinState });
      setNote({ ...note, isPinned: newPinState });
    } catch (error) {
      console.error('更新失败:', error);
    }
  };

  useEffect(() => {
    loadSettings();
    loadNote();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">笔记不存在</p>
          <Link to="/" className="text-blue-600 hover:underline">返回首页</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
                <span>返回</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <>
                  <button
                    onClick={handleTogglePin}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={note.isPinned ? '取消置顶' : '置顶'}
                  >
                    <Pin className={cn("w-5 h-5", note.isPinned ? "text-amber-500" : "text-gray-500")} />
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                  >
                    <FilePen className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}
              {isEditing && (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setTitle(note.title);
                      setContent(note.content);
                      setCategory(note.category);
                      setRooms(note.rooms || (note.room ? [note.room] : []));
                      setProgress(note.progress || '');
                      setBudget(note.budget?.toString() || '');
                      setActualCost(note.actualCost?.toString() || '');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? '保存中...' : '保存'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        {!isEditing ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex flex-wrap gap-2 mb-6">
              <Badge category={category} categories={settings.categories} />
              {rooms.map((roomId) => {
                const roomConfig = settings.rooms.find(r => r.id === roomId);
                return roomConfig ? <RoomBadge key={roomId} room={roomId} rooms={settings.rooms} /> : null;
              })}
              {progress && <ProgressBadge status={progress} statuses={settings.statuses} />}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">{note.title}</h1>
            <p className="text-sm text-gray-500 mb-8">创建时间: {note.date}</p>

            <div
              className="prose max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }}
            />

            {(note.budget || note.actualCost) && (
              <div className="mt-8 bg-gray-50 p-6 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  预算信息
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">预算金额</p>
                    <p className="text-xl font-bold text-gray-900">¥{note.budget?.toLocaleString() || '0'}</p>
                  </div>
                  {note.actualCost && note.actualCost > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">实际花费</p>
                      <p className={cn("text-xl font-bold", note.actualCost > (note.budget || 0) ? "text-red-600" : "text-green-600")}>
                        ¥{note.actualCost.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">分类</label>
                <div className="flex flex-wrap gap-2">
                  {settings.categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={cn(
                        "flex-1 min-w-[80px] py-2 px-3 rounded-lg text-sm font-medium transition-all border",
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
                <label className="block text-sm font-medium mb-1">标题 *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">房间（可多选）</label>
                  <div className="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                    {settings.rooms.map(r => (
                      <label key={r.id} className="flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={rooms.includes(r.id)}
                          onChange={() => toggleRoom(r.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm flex items-center gap-1">
                          {getRoomIcon(r.icon)}
                          {r.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">进度状态</label>
                  <select
                    value={progress}
                    onChange={(e) => setProgress(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                  >
                    {settings.statuses.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">预算 (元)</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">实际花费 (元)</label>
                  <input
                    type="number"
                    value={actualCost}
                    onChange={(e) => setActualCost(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">内容 (Markdown)</label>
                <MarkdownEditor
                  content={content}
                  onChange={setContent}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// --- Budget Components ---
const BudgetSummary = ({ expenses }: { expenses: ExpenseItem[] }) => {
  const totalBudgeted = expenses.reduce((sum, e) => sum + e.budgeted, 0);
  const totalActual = expenses.reduce((sum, e) => sum + e.actual, 0);
  const progress = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;
  const remaining = totalBudgeted - totalActual;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">预算概览</h3>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm text-gray-500">总预算</p>
            <p className="text-2xl font-bold text-gray-900">¥{totalBudgeted.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">已花费</p>
            <p className={cn("text-2xl font-bold", remaining < 0 ? "text-red-600" : "text-green-600")}>
              ¥{totalActual.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">使用进度</span>
            <span className="font-medium">{progress.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", progress > 100 ? "bg-red-500" : "bg-blue-500")}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-sm text-gray-500">剩余预算</p>
            <p className={cn("text-lg font-semibold", remaining < 0 ? "text-red-600" : "text-green-600")}>
              ¥{remaining.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">超支金额</p>
            <p className={cn("text-lg font-semibold", remaining < 0 ? "text-red-600" : "text-gray-400")}>
              {remaining < 0 ? `¥${Math.abs(remaining).toLocaleString()}` : '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExpenseTable = ({ expenses }: { expenses: ExpenseItem[] }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">费用明细</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">项目</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分类</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">房间</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">预算</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">实际</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {expenses.map(expense => {
              const diff = expense.actual - expense.budgeted;
              return (
                <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{expense.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{expense.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    {expense.room && <span className="text-sm text-gray-500">{expense.room}</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    ¥{expense.budgeted.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn("font-medium", diff > 0 ? "text-red-600" : "text-gray-900")}>
                      ¥{expense.actual.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium",
                      expense.status === 'paid'
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    )}>
                      {expense.status === 'paid' ? '已支付' : '待支付'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Settings Modal ---
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (settings: Settings) => Promise<void>;
}

const SettingsModal = ({ isOpen, onClose, settings, onUpdate }: SettingsModalProps) => {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [activeTab, setActiveTab] = useState<'categories' | 'rooms' | 'statuses'>('categories');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(localSettings);
      onClose();
    } catch (error) {
      console.error('保存设置失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = (type: 'categories' | 'rooms' | 'statuses') => {
    const id = Date.now().toString(36);
    setLocalSettings(prev => {
      const newSettings = { ...prev };
      if (type === 'categories') {
        newSettings.categories = [...prev.categories, { id, label: '新分类', color: 'bg-gray-100 text-gray-700' }];
      } else if (type === 'rooms') {
        newSettings.rooms = [...prev.rooms, { id, label: '新房间', icon: 'home' }];
      } else if (type === 'statuses') {
        newSettings.statuses = [...prev.statuses, { id, label: '新状态', color: 'bg-gray-100 text-gray-700', icon: 'alert' }];
      }
      return newSettings;
    });
  };

  const removeItem = (type: 'categories' | 'rooms' | 'statuses', id: string) => {
    setLocalSettings(prev => {
      const newSettings = { ...prev };
      if (type === 'categories') {
        newSettings.categories = prev.categories.filter(c => c.id !== id);
      } else if (type === 'rooms') {
        newSettings.rooms = prev.rooms.filter(r => r.id !== id);
      } else if (type === 'statuses') {
        newSettings.statuses = prev.statuses.filter(s => s.id !== id);
      }
      return newSettings;
    });
  };

  const updateItem = (type: 'categories' | 'rooms' | 'statuses', id: string, updates: any) => {
    setLocalSettings(prev => {
      const newSettings = { ...prev };
      if (type === 'categories') {
        newSettings.categories = prev.categories.map(c => c.id === id ? { ...c, ...updates } : c);
      } else if (type === 'rooms') {
        newSettings.rooms = prev.rooms.map(r => r.id === id ? { ...r, ...updates } : r);
      } else if (type === 'statuses') {
        newSettings.statuses = prev.statuses.map(s => s.id === id ? { ...s, ...updates } : s);
      }
      return newSettings;
    });
  };

  const colorOptions = [
    { bg: 'bg-amber-100', text: 'text-amber-700', label: '琥珀' },
    { bg: 'bg-blue-100', text: 'text-blue-700', label: '蓝色' },
    { bg: 'bg-green-100', text: 'text-green-700', label: '绿色' },
    { bg: 'bg-purple-100', text: 'text-purple-700', label: '紫色' },
    { bg: 'bg-pink-100', text: 'text-pink-700', label: '粉色' },
    { bg: 'bg-red-100', text: 'text-red-700', label: '红色' },
    { bg: 'bg-gray-100', text: 'text-gray-700', label: '灰色' },
  ];

  const iconOptions = [
    { id: 'home', icon: <Home className="w-4 h-4" /> },
    { id: 'sofa', icon: <Sofa className="w-4 h-4" /> },
    { id: 'utensils', icon: <Utensils className="w-4 h-4" /> },
    { id: 'bath', icon: <Bath className="w-4 h-4" /> },
    { id: 'bed', icon: <Bed className="w-4 h-4" /> },
    { id: 'book', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'user', icon: <User className="w-4 h-4" /> },
    { id: 'flower', icon: <Flower2 className="w-4 h-4" /> },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-lg">系统设置</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('categories')}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === 'categories'
                ? "bg-white text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            分类管理
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === 'rooms'
                ? "bg-white text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            房间管理
          </button>
          <button
            onClick={() => setActiveTab('statuses')}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === 'statuses'
                ? "bg-white text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            状态管理
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'categories' && (
            <div className="space-y-3">
              {localSettings.categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className={cn("px-3 py-1 rounded-full text-sm font-medium", cat.color)}>
                    {cat.label}
                  </span>
                  <input
                    type="text"
                    value={cat.label}
                    onChange={(e) => updateItem('categories', cat.id, { label: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <div className="flex gap-1">
                    {colorOptions.map((color) => (
                      <button
                        key={`${cat.id}-${color.bg}`}
                        onClick={() => updateItem('categories', cat.id, { color: `${color.bg} ${color.text}` })}
                        className={cn(
                          "w-6 h-6 rounded-full border-2",
                          `${color.bg}`,
                          cat.color === `${color.bg} ${color.text}` ? "border-blue-500" : "border-transparent"
                        )}
                        title={color.label}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => removeItem('categories', cat.id)}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addItem('categories')}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                + 添加分类
              </button>
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="space-y-3">
              {localSettings.rooms.map((room) => (
                <div key={room.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-gray-200 rounded-lg">
                    {getRoomIcon(room.icon)}
                  </div>
                  <input
                    type="text"
                    value={room.label}
                    onChange={(e) => updateItem('rooms', room.id, { label: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <div className="flex gap-1">
                    {iconOptions.map((icon) => (
                      <button
                        key={`${room.id}-${icon.id}`}
                        onClick={() => updateItem('rooms', room.id, { icon: icon.id })}
                        className={cn(
                          "p-2 rounded-lg border-2 transition-colors",
                          room.icon === icon.id ? "border-blue-500 bg-blue-50" : "border-transparent hover:bg-gray-100"
                        )}
                      >
                        {icon.icon}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => removeItem('rooms', room.id)}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addItem('rooms')}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                + 添加房间
              </button>
            </div>
          )}

          {activeTab === 'statuses' && (
            <div className="space-y-3">
              {localSettings.statuses.map((status) => (
                <div key={status.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className={cn("flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium", status.color)}>
                    {getStatusIcon(status.icon)}
                    {status.label}
                  </span>
                  <input
                    type="text"
                    value={status.label}
                    onChange={(e) => updateItem('statuses', status.id, { label: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <div className="flex gap-1">
                    {colorOptions.map((color) => (
                      <button
                        key={`${status.id}-${color.bg}`}
                        onClick={() => updateItem('statuses', status.id, { color: `${color.bg} ${color.text}` })}
                        className={cn(
                          "w-6 h-6 rounded-full border-2",
                          `${color.bg}`,
                          status.color === `${color.bg} ${color.text}` ? "border-blue-500" : "border-transparent"
                        )}
                        title={color.label}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => removeItem('statuses', status.id)}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addItem('statuses')}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                + 添加状态
              </button>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Home Page ---
const HomePage = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [expenses] = useState<ExpenseItem[]>(MOCK_EXPENSES);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeRooms, setActiveRooms] = useState<string[]>([]);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('notes');
  const [isLoading, setIsLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<string>('连接中...');

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
        setServerStatus('已连接 - 数据已保存到服务器');
      }
    } catch (error) {
      console.error('加载笔记失败:', error);
      setNotes(MOCK_NOTES);
      setServerStatus('未连接 - 使用本地数据');
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
        title = titleMatch[1].trim();
        noteContent = content.replace(/^#\s+.+$/m, '').trim();
      }

      importData.push({
        title,
        content: noteContent,
        category: settings.categories[0].id
      });
    }

    if (importData.length === 0) {
      alert('没有找到有效的Markdown文件');
      return 0;
    }

    try {
      const res = await api.post('/import/batch', { files: importData });
      if (res.data.success) {
        await loadNotes();
        return importData.length;
      }
    } catch (error) {
      console.error('导入失败:', error);
      const newNotes = importData.map((data, idx) => ({
        id: Date.now() + idx.toString(),
        category: data.category,
        title: data.title,
        content: data.content,
        date: new Date().toISOString().split('T')[0],
      }));
      setNotes([...newNotes, ...notes]);
      alert('导入成功！');
      return importData.length;
    }
    return 0;
  };

  useEffect(() => {
    loadSettings();
    loadNotes();
  }, []);

  const filteredNotes = notes.filter(note => {
    const matchesSearch = !searchQuery ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !activeCategory || note.category === activeCategory;
    const noteRooms = note.rooms || (note.room ? [note.room] : []);
    const matchesRoom = activeRooms.length === 0 || noteRooms.some(r => activeRooms.includes(r));
    const matchesStatus = !activeStatus || note.progress === activeStatus;
    return matchesSearch && matchesCategory && matchesRoom && matchesStatus;
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                  装
                </div>
                <span className="font-bold text-xl">装修记事本</span>
              </div>
              <span className="text-xs text-gray-500">{serverStatus}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('notes')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    viewMode === 'notes'
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  笔记
                </button>
                <button
                  onClick={() => setViewMode('budget')}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    viewMode === 'budget'
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  预算
                </button>
              </div>

              <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 mr-2 text-gray-500" />
                <input
                  type="text"
                  placeholder="搜索笔记..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none w-48"
                />
              </div>
              <div className="flex gap-2">
                {viewMode === 'notes' && (
                  <>
                    <button
                      onClick={() => setIsSettingsModalOpen(true)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                      title="设置"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                      title="批量导入Markdown"
                    >
                      <Upload className="w-5 h-5" />
                    </button>
                    <Link
                      to="/note/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      新建笔记
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {viewMode === 'notes' ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">装修进度管理</h1>
              <p className="text-gray-600">记录每个环节的设计灵感、产品信息和预算支出。点击笔记卡片在新标签页打开。</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    !activeCategory ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  )}
                >
                  全部分类
                </button>
                {settings.categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                      activeCategory === cat.id
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveRooms([])}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                    activeRooms.length === 0 ? "bg-emerald-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <Home className="w-4 h-4" />
                  全部房间
                </button>
                {settings.rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleRoomToggle(room.id)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                      activeRooms.includes(room.id)
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    {getRoomIcon(room.icon)}
                    {room.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveStatus(null)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                    !activeStatus ? "bg-violet-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  )}
                >
                  全部状态
                </button>
                {settings.statuses.map((status) => (
                  <button
                    key={status.id}
                    onClick={() => setActiveStatus(activeStatus === status.id ? null : status.id)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                      activeStatus === status.id
                        ? "bg-violet-600 text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    {getStatusIcon(status.icon)}
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500">正在加载笔记...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    settings={settings}
                    onTogglePin={handleTogglePin}
                    onUpdateStatus={handleUpdateStatus}
                  />
                ))}
                {sortedNotes.length === 0 && (
                  <div className="col-span-full py-20 text-center">
                    <h3 className="text-lg font-medium text-gray-900">没有找到匹配的笔记</h3>
                    <p className="text-gray-500 mt-1">尝试调整搜索条件或添加新的笔记。</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">预算与费用管理</h1>
              <p className="text-gray-600">跟踪装修预算和实际支出，掌控每一分钱的去向。</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <BudgetSummary expenses={expenses} />

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Home className="w-5 h-5 text-emerald-600" />
                    按房间统计
                  </h3>
                  <div className="space-y-3">
                    {settings.rooms.slice(0, 5).map(room => {
                      const roomExpenses = expenses.filter(e => e.room === room.id);
                      const budget = roomExpenses.reduce((sum, e) => sum + e.budgeted, 0);
                      const actual = roomExpenses.reduce((sum, e) => sum + e.actual, 0);
                      if (budget === 0) return null;
                      return (
                        <div key={room.id} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-1 text-gray-600">
                              {getRoomIcon(room.icon)}
                              {room.label}
                            </span>
                            <span className="text-gray-900 font-medium">¥{actual.toLocaleString()}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min((actual / budget) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <ExpenseTable expenses={expenses} />
              </div>
            </div>
          </>
        )}
      </main>

      <AddNoteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddNote}
        settings={settings}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdate={handleUpdateSettings}
      />

      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="font-semibold">批量导入Markdown</h2>
              <button onClick={() => setIsImportModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-2">点击或拖拽 .md 文件到这里</p>
                <input
                  type="file"
                  multiple
                  accept=".md"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files) return;

                    const importedCount = await handleBatchImport(files);
                    alert(`成功导入 ${importedCount} 个文件！`);
                    setIsImportModalOpen(false);
                  }}
                  className="hidden"
                  id="fileInput"
                />
                <label htmlFor="fileInput" className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  选择文件
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main Application ---
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/note/new" element={<CreateNotePage />} />
      <Route path="/note/:id" element={<NoteDetailPage />} />
    </Routes>
  );
}
