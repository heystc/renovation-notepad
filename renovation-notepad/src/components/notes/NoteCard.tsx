import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pin, MoreVertical, DollarSign } from 'lucide-react';
import type { Note, Settings } from '../../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CategoryBadge } from '../badges/CategoryBadge';
import { RoomBadge } from '../badges/RoomBadge';
import { ProgressBadge } from '../badges/ProgressBadge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NoteCardProps {
  note: Note;
  settings: Settings;
  onTogglePin: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, settings, onTogglePin, onUpdateStatus }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Link
      to={`/note/${note.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block active:opacity-80"
    >
      <div className={cn(
        "bg-white rounded-xl border p-3 sm:p-4 shadow-sm hover:shadow-md transition-all relative cursor-pointer",
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
            <CategoryBadge category={note.category} categories={settings.categories} />
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
              className="p-2 hover:bg-gray-100 rounded transition-colors active:bg-gray-200"
            >
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>

            {showMenu && (
              <>
                <div className="absolute right-0 top-8 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(note.id);
                      setShowMenu(false);
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(note.id, status.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2 active:bg-gray-100"
                    >
                      {/* Need to get status icon here - we can inline for simplicity */}
                      {getStatusIconInline(status.icon)}
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
    </Link>
  );
};

import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

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
