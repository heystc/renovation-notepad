import type { Note, Settings } from '../types';

const STORAGE_KEYS = {
  notes: 'renovation_notes',
  settings: 'renovation_settings',
};

// 获取所有笔记
export const getNotes = (): Note[] => {
  const data = localStorage.getItem(STORAGE_KEYS.notes);
  return data ? JSON.parse(data) : [];
};

// 保存笔记
export const saveNotes = (notes: Note[]): void => {
  localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes));
};

// 添加笔记
export const addNote = (note: Note): void => {
  const notes = getNotes();
  notes.unshift(note);
  saveNotes(notes);
};

// 更新笔记
export const updateNote = (id: string, updates: Partial<Note>): void => {
  const notes = getNotes();
  const index = notes.findIndex(n => n.id === id);
  if (index !== -1) {
    notes[index] = { ...notes[index], ...updates };
    saveNotes(notes);
  }
};

// 删除笔记（暂时保留接口，以后需要再加UI）
export const deleteNote = (id: string): void => {
  const notes = getNotes();
  const filtered = notes.filter(n => n.id !== id);
  saveNotes(filtered);
};

// 获取设置
export const getSettings = (defaultSettings: Settings): Settings => {
  const data = localStorage.getItem(STORAGE_KEYS.settings);
  if (data) {
    return JSON.parse(data);
  }
  return defaultSettings;
};

// 保存设置
export const saveSettings = (settings: Settings): void => {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
};
