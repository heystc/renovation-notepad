import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { MarkdownManager } from '@tiptap/markdown';
import ImageExtension from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Bold, Italic, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Camera, Check, Code, Strikethrough, Underline as UnderlineIcon, ListTodo, Table as TableIcon, Palette } from 'lucide-react';
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
  const [isUploading, setIsUploading] = useState(false);
  const [isContinuousCameraMode, setIsContinuousCameraMode] = useState(false);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [parseError, setParseError] = useState(false);
  const [showTextColorPalette, setShowTextColorPalette] = useState(false);
  const [showHighlightPalette, setShowHighlightPalette] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraFileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textColorRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭颜色面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (textColorRef.current && !textColorRef.current.contains(event.target as Node)) {
        setShowTextColorPalette(false);
      }
      if (highlightRef.current && !highlightRef.current.contains(event.target as Node)) {
        setShowHighlightPalette(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 保存内容ref用于insertAtCursor
  const contentRef = useRef<string>(content);
  contentRef.current = content;

  // 标记是否已经应用过开头占位符修复，避免无限循环
  const hasAppliedPlaceholder = useRef(false);
  // 记录最后一次同步到编辑器的内容，避免不必要更新导致光标丢失
  const lastSyncedContent = useRef<string>('');

  // 创建Markdown管理器，用于手动解析Markdown
  const markdownManager = useMemo(() => {
    return new MarkdownManager({
      extensions: [
        StarterKit.configure({
          strike: {},
        }),
        ImageExtension,
        Link,
        Underline,
        TextStyle,
        Color,
        Highlight,
        Table,
        TableRow,
        TableCell,
        TableHeader,
        TaskList,
        TaskItem,
      ],
    });
  }, []);

  // 捕获全局错误，当ProseMirror发生内容错误时自动切换到代码模式
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const error = event.error;
      if (error instanceof RangeError && error.message.includes('Invalid content for node paragraph')) {
        console.warn('Detected ProseMirror content error for multiple images, switching to code mode');
        setParseError(true);
        setIsCodeMode(true);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // 在光标处插入文本 (for code mode)
  const insertAtCursor = (before: string, after = '') => {
    const textarea = textareaRef.current || document.getElementById('markdown-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const currentContent = contentRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = currentContent.substring(start, end);
    const newText = currentContent.substring(0, start) + before + selectedText + after + currentContent.substring(end);

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

  // 压缩图片配置常量
  const MAX_IMAGE_DIMENSION = 1920;
  const MIN_SIZE_FOR_COMPRESSION = 1024 * 1024; // 1MB
  const COMPRESSION_QUALITY = 0.9;

  const compressImage = async (file: File): Promise<Blob> => {
    // 如果图片较小，不压缩（小于 1MB）
    if (file.size < MIN_SIZE_FOR_COMPRESSION) {
      return file;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // 计算压缩后的尺寸，保持宽高比，最大长边不超过 MAX_IMAGE_DIMENSION
          const maxWidth = MAX_IMAGE_DIMENSION;
          const maxHeight = MAX_IMAGE_DIMENSION;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = height * (maxWidth / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = width * (maxHeight / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          // 绘制图片
          ctx.drawImage(img, 0, 0, width, height);

          // 输出为 JPEG，质量 0.9，更好的画质，文件大小仍可控
          canvas.toBlob((blob) => {
            if (blob) {
              // 如果压缩后更大，返回原文件
              resolve(blob.size < file.size ? blob : file);
            } else {
              resolve(file);
            }
          }, 'image/jpeg', COMPRESSION_QUALITY);
        };
        img.onerror = () => {
          resolve(file);
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        resolve(file);
      };
      reader.readAsDataURL(file);
    });
  };

  const uploadImage = async (file: File): Promise<string> => {
    // 先压缩图片
    const compressedBlob = await compressImage(file);
    // 创建新的 File 对象
    const compressedFile = new File([compressedBlob], file.name, { type: compressedBlob.type || file.type });

    const formData = new FormData();
    formData.append('image', compressedFile);
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

  // Initialize Tiptap editor first for handlePaste
  const processedContent = useMemo(() => {
    try {
      let processed = content;

      // ==============================
      // 兼容性预处理：为图片添加前后空行
      // Tiptap/ProseMirror 要求块级图片前后必须有空行，否则多个图片会被放在同一个 paragraph 导致解析错误
      // 自动给所有 ![...]() 添加前后空行，不改变原始内容语义，只保证解析正确
      // ==============================
      // 1. 给每个图片前后添加空行
      processed = processed.replace(/(!\[.*?\]\(.*?\))/g, '\n\n$1\n\n');
      // 2. 合并连续多个空行为两个，避免过多空行
      processed = processed.replace(/\n{3,}/g, '\n\n');
      // 3. 去除开头和结尾多余空行
      processed = processed.trim();

      // Workaround for Tiptap markdown bug: document starting with image causes parsing/serialization error
      // If content starts with image (![...]), add an empty placeholder at the beginning to avoid the bug
      // Empty placeholder doesn't affect rendering and doesn't affect content
      const trimmed = processed.trimStart();
      if (trimmed.startsWith('![')) {
        processed = '# \n\n' + processed;
      }

      return processed;
    } catch (error) {
      return content;
    }
  }, [content]);

  // If we modified the content (added placeholder), update parent state once after render
  useEffect(() => {
    if (processedContent !== content && !hasAppliedPlaceholder.current) {
      hasAppliedPlaceholder.current = true;
      onChange(processedContent);
    }
  }, [processedContent, content, onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // We handle markdown conversion ourselves using markdownManager
        // Avoid conflict with Markdown extension
        strike: {},
      }),
      ImageExtension.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full my-4',
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 p-2 align-top',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 p-2 bg-gray-50 font-semibold align-top',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
    ],
    // Start with empty content, we'll set it in useEffect
    // This prevents editor from being recreated on every content change
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base max-w-none min-h-[200px] p-4 focus:outline-none markdown-body',
        placeholder: placeholder || '开始输入内容...',
      },
      handlePaste: (_view, event) => {
        // 让我们自己处理图片粘贴
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
              handleImagePaste(event);
              return true;
            }
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      // Convert HTML back to Markdown using markdownManager
      // Using markdownManager instead of editor.getMarkdown() for better compatibility with multiple images
      try {
        const json = editor.getJSON();
        const markdown = markdownManager.serialize(json);
        lastSyncedContent.current = markdown;
        onChange(markdown);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to convert editor content to Markdown:', errorMessage);
        setParseError(true);
        setIsCodeMode(true);
      }
    },
  });

  const insertImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('只能上传图片文件');
      // 如果上传失败且在连续拍照模式，停止模式
      if (isContinuousCameraMode) {
        stopContinuousCamera();
      }
      return;
    }
    try {
      setIsUploading(true);
      const imageUrl = await uploadImage(file);
      const alt = file.name.replace(/\.[^/.]+$/, '');
      if (isCodeMode) {
        // 代码模式：插入Markdown语法
        insertAtCursor(`![${alt}](${imageUrl})`);
      } else {
        // 可视化模式：在Tiptap中插入图片
        editor?.chain().focus().setImage({ src: imageUrl, alt }).run();
      }
    } catch (error) {
      console.error('上传图片失败:', error);
      alert('图片上传失败，请重试');
      // 上传失败时停止连续拍照模式，避免无限失败循环
      if (isContinuousCameraMode) {
        stopContinuousCamera();
      }
    } finally {
      setIsUploading(false);
    }
  };

  // 处理粘贴，检测图片
  const handleImagePaste = (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        event.preventDefault();
        const file = item.getAsFile();
        if (file) {
          insertImage(file);
        }
        return;
      }
    }
  };

  // 工具栏命令处理
  const toggleBold = () => {
    editor?.chain().focus().toggleBold().run();
  };

  const toggleItalic = () => {
    editor?.chain().focus().toggleItalic().run();
  };

  const toggleHeading1 = () => {
    editor?.chain().focus().toggleHeading({ level: 1 }).run();
  };

  const toggleHeading2 = () => {
    editor?.chain().focus().toggleHeading({ level: 2 }).run();
  };

  const toggleBulletList = () => {
    editor?.chain().focus().toggleBulletList().run();
  };

  const toggleOrderedList = () => {
    editor?.chain().focus().toggleOrderedList().run();
  };

  const toggleStrike = () => {
    editor?.chain().focus().toggleStrike().run();
  };

  const toggleUnderline = () => {
    editor?.chain().focus().toggleUnderline().run();
  };

  const toggleTaskList = () => {
    editor?.chain().focus().toggleTaskList().run();
  };

  const insertTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const setTextColor = (color: string) => {
    editor?.chain().focus().setColor(color).run();
  };

  const setHighlightColor = (color: string) => {
    editor?.chain().focus().toggleHighlight({ color }).run();
  };

  const unsetTextColor = () => {
    editor?.chain().focus().unsetColor().run();
  };

  const unsetHighlightColor = () => {
    editor?.chain().focus().toggleHighlight().run();
  };

  const insertLink = () => {
    const url = prompt('输入链接地址:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
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
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        await insertImage(file);
      }
    }
    // 清空 value，允许重复选择相同文件
    e.target.value = '';
  };

  // 连续拍照上传 - 开始拍照模式
  const startContinuousCamera = () => {
    setIsContinuousCameraMode(true);
    // 延迟一点打开相机，确保状态已更新
    setTimeout(() => {
      cameraFileInputRef.current?.click();
    }, 100);
  };

  // 结束拍照模式
  const stopContinuousCamera = () => {
    setIsContinuousCameraMode(false);
    if (cameraFileInputRef.current) {
      cameraFileInputRef.current.value = '';
    }
  };

  // 处理拍照完成
  const handleCameraChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      // 用户取消了拍照，如果是连续模式，继续等待下一次拍照
      if (isContinuousCameraMode) {
        e.target.value = '';
        setTimeout(() => {
          cameraFileInputRef.current?.click();
        }, 500);
      } else {
        setIsContinuousCameraMode(false);
      }
      return;
    }

    const file = files[0];
    if (file.type.startsWith('image/')) {
      await insertImage(file);
    }

    // 清空 value，允许重复拍照
    e.target.value = '';

    // 如果还是连续拍照模式，自动重新打开相机
    if (isContinuousCameraMode) {
      setTimeout(() => {
        cameraFileInputRef.current?.click();
      }, 500);
    }
  };

  // 当外部content变化时更新编辑器
  // 只在内容真正改变时（比如打开不同笔记）才更新，避免每次输入都覆盖编辑器内容导致光标丢失
  React.useEffect(() => {
    if (editor && !isCodeMode && content !== lastSyncedContent.current) {
      try {
        const jsonContent = markdownManager.parse(content);
        editor.commands.setContent(jsonContent, { emitUpdate: false });
        lastSyncedContent.current = content;
        setParseError(false);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to update Markdown for visual editor, switching to code mode:', errorMessage);
        setParseError(true);
        setIsCodeMode(true);
      }
    }
  }, [content, editor, markdownManager, isCodeMode]);

  return (
    <div
      className="border border-gray-200 rounded-lg overflow-hidden relative bg-white"
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
        {/* 模式切换 */}
        <button
          type="button"
          onClick={() => setIsCodeMode(!isCodeMode)}
          className={cn(
            "p-2 sm:p-3 rounded transition-colors active:bg-gray-300 border",
            isCodeMode ? "bg-blue-100 border-blue-300 text-blue-700" : "hover:bg-gray-200 border-transparent"
          )}
          title={isCodeMode ? "当前：代码模式" : "当前：可视化模式"}
        >
          <Code className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1 hidden sm:block" />
        {/* 格式按钮 */}
        <button
          type="button"
          onClick={toggleBold}
          className={cn(
            "p-2 sm:p-3 rounded transition-colors active:bg-gray-300",
            !isCodeMode && editor?.isActive('bold') ? "bg-gray-200" : "hover:bg-gray-200"
          )}
          title="粗体"
          disabled={isCodeMode}
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toggleItalic}
          className={cn(
            "p-2 sm:p-3 rounded transition-colors active:bg-gray-300",
            !isCodeMode && editor?.isActive('italic') ? "bg-gray-200" : "hover:bg-gray-200"
          )}
          title="斜体"
          disabled={isCodeMode}
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toggleStrike}
          className={cn(
            "p-2 sm:p-3 rounded transition-colors active:bg-gray-300",
            !isCodeMode && editor?.isActive('strike') ? "bg-gray-200" : "hover:bg-gray-200"
          )}
          title="删除线"
          disabled={isCodeMode}
        >
          <Strikethrough className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toggleUnderline}
          className={cn(
            "p-2 sm:p-3 rounded transition-colors active:bg-gray-300",
            !isCodeMode && editor?.isActive('underline') ? "bg-gray-200" : "hover:bg-gray-200"
          )}
          title="下划线"
          disabled={isCodeMode}
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1 hidden sm:block" />
        <button
          type="button"
          onClick={toggleHeading1}
          className={cn(
            "p-2 sm:p-3 rounded transition-colors text-sm font-bold active:bg-gray-300",
            !isCodeMode && editor?.isActive('heading', { level: 1 }) ? "bg-gray-200" : "hover:bg-gray-200"
          )}
          title="标题"
          disabled={isCodeMode}
        >
          H1
        </button>
        <button
          type="button"
          onClick={toggleHeading2}
          className={cn(
            "p-2 sm:p-3 rounded transition-colors text-sm font-bold active:bg-gray-300",
            !isCodeMode && editor?.isActive('heading', { level: 2 }) ? "bg-gray-200" : "hover:bg-gray-200"
          )}
          title="二级标题"
          disabled={isCodeMode}
        >
          H2
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1 hidden sm:block" />
        <button
          type="button"
          onClick={toggleBulletList}
          className={cn(
            "p-2 sm:p-3 rounded transition-colors active:bg-gray-300",
            !isCodeMode && editor?.isActive('bulletList') ? "bg-gray-200" : "hover:bg-gray-200"
          )}
          title="无序列表"
          disabled={isCodeMode}
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toggleOrderedList}
          className={cn(
            "p-2 sm:p-3 rounded transition-colors active:bg-gray-300",
            !isCodeMode && editor?.isActive('orderedList') ? "bg-gray-200" : "hover:bg-gray-200"
          )}
          title="有序列表"
          disabled={isCodeMode}
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={toggleTaskList}
          className={cn(
            "p-2 sm:p-3 rounded transition-colors active:bg-gray-300",
            !isCodeMode && editor?.isActive('taskList') ? "bg-gray-200" : "hover:bg-gray-200"
          )}
          title="任务列表"
          disabled={isCodeMode}
        >
          <ListTodo className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1 hidden sm:block" />
        <button
          type="button"
          onClick={insertTable}
          className={cn(
            "p-2 sm:p-3 rounded transition-colors active:bg-gray-300",
            !isCodeMode && editor?.isActive('table') ? "bg-gray-200" : "hover:bg-gray-200"
          )}
          title="插入表格"
          disabled={isCodeMode}
        >
          <TableIcon className="w-4 h-4" />
        </button>
        <div className="relative" ref={textColorRef}>
          <button
            type="button"
            onClick={() => setShowTextColorPalette(!showTextColorPalette)}
            className={cn(
              "p-2 sm:p-3 rounded transition-colors active:bg-gray-300",
              (showTextColorPalette || (!isCodeMode && editor?.isActive('color'))) ? "bg-gray-200" : "hover:bg-gray-200"
            )}
            title="文字颜色"
            disabled={isCodeMode}
          >
            <Palette className="w-4 h-4" />
          </button>
          {showTextColorPalette && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20 grid grid-cols-6 gap-1 w-48">
              {['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#a8a29e', '#78716c'].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setTextColor(color);
                    setShowTextColorPalette(false);
                  }}
                  className="w-6 h-6 rounded border border-gray-300 cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  unsetTextColor();
                  setShowTextColorPalette(false);
                }}
                className="w-6 h-6 rounded border border-gray-300 bg-white flex items-center justify-center text-xs text-gray-500 hover:bg-gray-50"
                title="清除颜色"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        <div className="relative" ref={highlightRef}>
          <button
            type="button"
            onClick={() => setShowHighlightPalette(!showHighlightPalette)}
            className={cn(
              "p-2 sm:p-3 rounded transition-colors active:bg-gray-300",
              (showHighlightPalette || (!isCodeMode && editor?.isActive('highlight'))) ? "bg-gray-200" : "hover:bg-gray-200"
            )}
            title="背景高亮"
            disabled={isCodeMode}
          >
            <div className="w-4 h-4 border-2 border-current rounded" />
          </button>
          {showHighlightPalette && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20 grid grid-cols-6 gap-1 w-48">
              {['#fef08a', '#fecaca', '#d1fae5', '#dbeafe', '#ede9fe', '#fce7f3', '#ffedd5', '#e5e7eb', '#d6d3d1'].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setHighlightColor(color);
                    setShowHighlightPalette(false);
                  }}
                  className="w-6 h-6 rounded border border-gray-300 cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  unsetHighlightColor();
                  setShowHighlightPalette(false);
                }}
                className="w-6 h-6 rounded border border-gray-300 bg-white flex items-center justify-center text-xs text-gray-500 hover:bg-gray-50"
                title="清除高亮"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        <div className="w-px h-6 bg-gray-300 mx-1 hidden sm:block" />
        <button
          type="button"
          onClick={insertLink}
          className={cn(
            "p-2 sm:p-3 rounded transition-colors active:bg-gray-300",
            !isCodeMode && editor?.isActive('link') ? "bg-gray-200" : "hover:bg-gray-200"
          )}
          title="插入链接"
          disabled={isCodeMode}
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleImageButtonClick}
          disabled={isUploading || isCodeMode}
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
        {isContinuousCameraMode ? (
          <button
            type="button"
            onClick={stopContinuousCamera}
            disabled={isUploading || isCodeMode}
            className={cn(
              "p-2 sm:p-3 rounded transition-colors active:bg-green-400 bg-green-100",
              isUploading || isCodeMode ? "text-gray-400 cursor-not-allowed" : "hover:bg-green-200"
            )}
            title="完成拍照"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4 text-green-700" />
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={startContinuousCamera}
            disabled={isUploading || isCodeMode}
            className={cn(
              "p-2 sm:p-3 rounded transition-colors active:bg-blue-300",
              (isUploading || isCodeMode) ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "hover:bg-gray-200"
            )}
            title="连续拍照上传"
          >
            <Camera className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 可视化模式: Tiptap所见即所得 */}
      {!isCodeMode && <EditorContent editor={editor} />}

      {/* 代码模式: 纯文本textarea编辑 */}
      {isCodeMode && (
        <textarea
          ref={textareaRef}
          id="markdown-editor"
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onPaste={(e) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
              if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                  insertImage(file);
                }
                return;
              }
            }
          }}
          placeholder={placeholder || '开始输入内容...\n💡 提示: 可以直接从剪贴板粘贴图片，或将图片拖拽到这里'}
          className="w-full p-4 min-h-[200px] resize-y focus:outline-none text-base"
          style={{ fontFamily: 'Consolas, Monaco, "Courier New", monospace' }}
        />
      )}

      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex flex-wrap items-center gap-2">
        💡 {isCodeMode ? '代码模式: 直接编辑Markdown源代码' : '可视化模式: 所见即所得，图片实时显示'}
        <span className="ml-2">支持 <kbd className="px-2 py-0.5 bg-gray-200 rounded">Ctrl+V</kbd> 粘贴剪贴板图片 · 拖拽图片到此处插入</span>
        {isContinuousCameraMode && <span className="ml-2 text-blue-600 font-medium">📸 连续拍照模式已开启，拍完一张自动拍下一张</span>}
        {parseError && <span className="ml-2 text-red-600 font-medium">⚠️ 可视化解析失败，已自动切换到代码模式</span>}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraChange}
        className="hidden"
      />
    </div>
  );
};

export default MarkdownEditor;
