import React, { useState, useRef } from 'react';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import api from '../../utils/api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ content, onChange, placeholder }) => {
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const insertAtCursor = (before: string, after = '') => {
    const textarea = textareaRef.current || document.getElementById('markdown-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      if (selectedText) {
        textarea.setSelectionRange(start + before.length, newCursorPos);
      } else {
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (response.data.success) {
      const apiBaseUrl = api.defaults.baseURL || '';
      let imageUrl = response.data.url;
      if (apiBaseUrl.startsWith('http')) {
        const urlObj = new URL(apiBaseUrl);
        imageUrl = `${urlObj.origin}${response.data.url}`;
      }
      return imageUrl;
    }
    throw new Error(response.data.message || '上传失败');
  };

  const insertImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('只能上传图片文件');
      return;
    }
    try {
      setIsUploading(true);
      const imageUrl = await uploadImage(file);
      const alt = file.name.replace(/\.[^/.]+$/, '');
      insertAtCursor(`![${alt}](${imageUrl})`);
    } catch (error) {
      console.error('上传图片失败:', error);
      alert('图片上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await insertImage(file);
        }
        return;
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        await insertImage(file);
      }
    }
  };

  const handleImageButtonClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        await insertImage(file);
      }
    };
    input.click();
  };

  return (
    <div
      className="border border-gray-200 rounded-lg overflow-hidden relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {(isDragging || isUploading) && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 z-10 flex items-center justify-center rounded-lg">
          <p className="text-blue-600 font-medium bg-white px-4 py-2 rounded-lg shadow-sm">
            {isUploading ? '上传中...' : '松开鼠标插入图片'}
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border-b border-gray-200">
        <button
          onClick={() => insertAtCursor('**', '**')}
          className="p-2 sm:p-3 rounded hover:bg-gray-200 transition-colors active:bg-gray-300"
          title="粗体"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => insertAtCursor('*', '*')}
          className="p-2 sm:p-3 rounded hover:bg-gray-200 transition-colors active:bg-gray-300"
          title="斜体"
        >
          <Italic className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1 hidden sm:block" />
        <button
          onClick={() => insertAtCursor('# ')}
          className="p-2 sm:p-3 rounded hover:bg-gray-200 transition-colors text-sm font-bold active:bg-gray-300"
          title="标题"
        >
          H1
        </button>
        <button
          onClick={() => insertAtCursor('## ')}
          className="p-2 sm:p-3 rounded hover:bg-gray-200 transition-colors text-sm font-bold active:bg-gray-300"
          title="二级标题"
        >
          H2
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1 hidden sm:block" />
        <button
          onClick={() => insertAtCursor('- ')}
          className="p-2 sm:p-3 rounded hover:bg-gray-200 transition-colors active:bg-gray-300"
          title="无序列表"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => insertAtCursor('1. ')}
          className="p-2 sm:p-3 rounded hover:bg-gray-200 transition-colors active:bg-gray-300"
          title="有序列表"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1 hidden sm:block" />
        <button
          onClick={() => {
            const url = prompt('输入链接地址:');
            if (url) insertAtCursor('[链接文字](', ')');
          }}
          className="p-2 sm:p-3 rounded hover:bg-gray-200 transition-colors active:bg-gray-300"
          title="插入链接"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          onClick={handleImageButtonClick}
          disabled={isUploading}
          className={cn(
            "p-2 sm:p-3 rounded transition-colors active:bg-gray-300",
            isUploading ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "hover:bg-gray-200"
          )}
          title="插入图片"
        >
          {isUploading ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          ) : (
            <ImageIcon className="w-4 h-4" />
          )}
        </button>
      </div>
      <textarea
        ref={textareaRef}
        id="markdown-editor"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        placeholder={placeholder || '开始输入内容...\n💡 提示: 可以直接从剪贴板粘贴图片，或将图片拖拽到这里'}
        className="w-full p-4 min-h-[200px] resize-y focus:outline-none text-base"
        style={{ fontFamily: 'Consolas, Monaco, "Courier New", monospace' }}
      />
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        💡 提示: 支持 <kbd className="px-2 py-0.5 bg-gray-200 rounded">Ctrl+V</kbd> 粘贴剪贴板图片 · 拖拽图片到此处插入
      </div>
    </div>
  );
};

export default MarkdownEditor;
