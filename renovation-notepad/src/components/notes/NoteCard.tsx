import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Pin, MoreVertical, DollarSign, Trash2, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import type { Note, Settings } from '../../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CategoryBadge } from '../badges/CategoryBadge';
import { TagBadge } from '../badges/TagBadge';
import { ProgressBadge } from '../badges/ProgressBadge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 事件名称，用于通知关闭其他菜单
const CLOSE_OTHER_MENUS = 'close-other-note-menus';

interface NoteCardProps {
  note: Note;
  settings: Settings;
  onTogglePin: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, settings, onTogglePin, onUpdateStatus, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 监听关闭其他菜单事件，当收到事件且不是自己，则关闭
  useEffect(() => {
    const handleCloseOther = (e: CustomEvent<{ openedId: string }>) => {
    if (e.detail.openedId !== note.id) {
        setShowMenu(false);
      }
    };

    document.addEventListener(CLOSE_OTHER_MENUS, handleCloseOther as EventListener);
    return () => document.removeEventListener(CLOSE_OTHER_MENUS, handleCloseOther as EventListener);
  }, [note.id]);

  // 计算菜单位置
  const updateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // 菜单右对齐按钮，向下展开
      setMenuPosition({
        top: rect.bottom + 8, // 按钮下方留出 8px 间距
        left: rect.right - 176 // 菜单宽度 176px (w-44 = 176px)，右对齐
      });
    }
  };

  const handleCardClick = () => {
    // 如果菜单已打开，点击卡片关闭菜单，不跳转
    if (showMenu) {
      setShowMenu(false);
    } else {
      navigate(`/note/${note.id}`);
    }
  };

  // 渲染菜单内容（通过 Portal 挂载到 body）
  const renderMenu = () => {
    if (!showMenu) return null;

    return createPortal(
      <>
        <div
          className="fixed w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-[1000]"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              onTogglePin(note.id);
            }}
            className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2 active:bg-gray-100"
          >
            <Pin className="w-4 h-4" />
            {note.isPinned ? '取消置顶' : '置顶笔记'}
          </button>
          <div className="border-t border-gray-100 my-1" />
          {settings.statuses.map((status) => (
            <button
              key={status.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onUpdateStatus(note.id, status.id);
              }}
              className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2 active:bg-gray-100"
            >
              {getStatusIconInline(status.icon)}
              设为{status.label}
            </button>
          ))}
          <div className="border-t border-gray-100 my-1" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              if (window.confirm('确定要删除这篇笔记吗？删除后无法恢复。')) {
                onDelete(note.id);
              }
            }}
            className="w-full px-4 py-3 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600 active:bg-red-100"
          >
            <Trash2 className="w-4 h-4" />
            删除笔记
          </button>
        </div>
        <div
          className="fixed inset-0 z-[999] bg-transparent"
          onClick={() => setShowMenu(false)}
        />
      </>,
      document.body
    );
  };

  return (
    <div
      onClick={handleCardClick}
      className="block active:opacity-80 cursor-pointer"
    >
      <div className={cn(
        "bg-white rounded-xl border p-3 sm:p-4 shadow-sm hover:shadow-md transition-all relative h-[200px] flex flex-col",
        note.isPinned ? "border-amber-300 ring-1 ring-amber-100" : "border-gray-200"
      )}>
        {note.isPinned && (
          <div className="absolute -top-3 -right-1 bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs flex items-center gap-1 shadow-sm z-10">
            <Pin className="w-3 h-3" />
            置顶
          </div>
        )}

        <div className="flex justify-between items-start mb-3 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryBadge category={note.category} categories={settings.categories} />
            {(note.tags || note.rooms || (note.tag || note.room ? [note.tag || note.room] : [])).filter(Boolean).map(tagId => (
              <TagBadge key={tagId} tagId={tagId as string} settings={settings} />
            ))}
          </div>
          <div className="relative" onClick={(e) => e.preventDefault()}>
            <button
              ref={buttonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                // 先通知其他菜单关闭，等事件处理完成后再切换当前菜单状态
                const event = new CustomEvent(CLOSE_OTHER_MENUS, { detail: { openedId: note.id } });
                document.dispatchEvent(event);
                // setTimeout 让所有其他卡片先完成关闭，再更新当前状态
                setTimeout(() => {
                  if (!showMenu) {
                    updateMenuPosition();
                  }
                  setShowMenu(!showMenu);
                }, 0);
              }}
              className="p-2 hover:bg-gray-100 rounded transition-colors active:bg-gray-200"
            >
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {note.title}
          </h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-3 line-clamp-3 flex-1">
            {note.content.replace(/[#*_~\[\]]/g, '')}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 flex-shrink-0 mt-auto">
            <div className="flex items-center gap-2 flex-wrap">
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
      </div>
      {renderMenu()}
    </div>
  );
};

// Helper inline for menu items to avoid extra import
const getStatusIconInline = (iconName: string): React.ReactNode => {
  switch (iconName) {
    case 'alert': return <AlertCircle className="w-4 h-4" />;
    case 'clock': return <Clock className="w-4 h-4" />;
    case 'check': return <CheckCircle2 className="w-4 h-4" />;
    default: return <AlertCircle className="w-4 h-4" />;
  }
};

export default NoteCard;
