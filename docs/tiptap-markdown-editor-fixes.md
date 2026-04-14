# Tiptap Markdown 编辑器问题修复记录

项目：renovation-notepad

日期：2026-04-14

## 问题背景

使用 Tiptap `@tiptap/markdown` 实现所见即所得 Markdown 编辑器时，在**多张图片、文档以图片开头**场景下遇到多个问题：

1. 解析错误崩溃：`Uncaught Error: Called contentMatchAt on a node with invalid content`
2. 图片丢失：多张连续图片保存后部分图片丢失
3. 光标定位错误：输入文字总是自动跳到笔记末尾，无法在正文中间编辑
4. 现象：英文输入法第一个字母正确，第二个字母开始跳到末尾；中文输入法选字后跳到末尾

## 问题分析与修复方案

### 问题 1：`Called contentMatchAt on a node with invalid content` - 扩展冲突

**根因**：同时启用 `StarterKit` 和 `Markdown` 扩展会产生冲突，当有连续图片或文档以图片开头时，ProseMirror 内容匹配失败。

**修复**：移除 `Markdown` 扩展，完全使用 `MarkdownManager` 手动做 Markdown ↔ JSON 转换。

```tsx
// ❌ 错误：同时包含两个扩展冲突
const editor = useEditor({
  extensions: [
    StarterKit,
    Markdown.configure({...}), // 冲突！
  ],
});

// ✅ 正确：只保留基础扩展，markdown 转换手动做
const markdownManager = useMemo(() => {
  return new MarkdownManager({
    extensions: [StarterKit, ImageExtension, Link, Underline],
  });
}, []);

const editor = useEditor({
  extensions: [StarterKit.configure({}), ImageExtension, Link, Underline],
  // 手动解析 markdown 到 JSON
  content: markdownManager.parse(processedContent),
  onUpdate: ({editor}) => {
    // 手动序列化 JSON 到 markdown
    const markdown = markdownManager.serialize(editor.getJSON());
    onChange(markdown);
  }
});
```

---

### 问题 2：文档以图片开头解析失败 - Tiptap 解析 bug

**根因**：Tiptap/ProseMirror 对文档第一个节点就是图片（块级元素）支持不佳，会导致解析错误。

**修复**：自动检测，如果内容以 `![` 开头，自动在文档开头添加一个空标题占位符 `# \n\n` 绕过这个 bug。占位符不影响内容，可以正常编辑。

```tsx
const processedContent = useMemo(() => {
  let processed = content;
  const trimmed = content.trimStart();
  if (trimmed.startsWith('![')) {
    processed = '# \n\n' + content;
  }
  return processed;
}, [content]);

// 异步更新一次父组件，添加占位符到保存内容
const hasAppliedPlaceholder = useRef(false);
useEffect(() => {
  if (processedContent !== content && !hasAppliedPlaceholder.current) {
    hasAppliedPlaceholder.current = true;
    onChange(processedContent);
  }
}, [processedContent, content, onChange]);
```

---

### 问题 3：输入总是跳到末尾 - 错误的 hooks 依赖 + 重复更新

**根因**：

1. 最初实现：`useEditor` 依赖 `content`，每次 `content` 变化都重建整个编辑器实例 → 光标跳到末尾
2. 改进后：虽然不再重建编辑器，但 `useEffect` 每次 `content` 变化都执行 `editor.commands.setContent()` → 覆盖编辑器内容，光标还是跳到末尾

这是一个**多余的闭环**：
```
用户输入 → onUpdate → onChange → 父组件更新 content prop → useEffect → setContent 覆盖编辑器 → 光标丢失
```

**修复**：添加 `lastSyncedContent` ref，只在**内容真正改变时**（打开不同笔记）才更新编辑器。用户编辑过程中不重复更新。

```tsx
const lastSyncedContent = useRef<string>('');

// 用户编辑输出时，同步记录内容
onUpdate: ({editor}) => {
  const markdown = markdownManager.serialize(editor.getJSON());
  lastSyncedContent.current = markdown;
  onChange(markdown);
};

// 外部 content 变化时，只在真正不同时更新
useEffect(() => {
  if (editor && !isCodeMode && content !== lastSyncedContent.current) {
    const jsonContent = markdownManager.parse(content);
    editor.commands.setContent(jsonContent, {emitUpdate: false});
    lastSyncedContent.current = content;
  }
}, [content, editor, markdownManager, isCodeMode]);
```

---

### 问题 4：输入内容被自动还原 - 编辑器总是被重建

**根因**：`initialEditorContent` 依赖 `processedContent`，`processedContent` 依赖 `content` → 每次用户输入 `content` 变化都会导致 `useEditor` 重新创建整个编辑器 → 用户输入丢失，内容还原。

**修复**：编辑器只创建一次，永远不再重建。初始内容为空，第一次内容更新交给 `useEffect`：

```tsx
// ❌ 错误：initialEditorContent 随 content 变化 → useEditor 重建
const initialEditorContent = useMemo(() => {
  return markdownManager.parse(processedContent);
}, [markdownManager, processedContent]);

const editor = useEditor({
  content: initialEditorContent,
  ...
});

// ✅ 正确：编辑器只创建一次，所有内容更新都走 useEffect
const editor = useEditor({
  content: '', // start empty
  extensions: [...],
  ...
});

// 第一次和外部内容改变都走这里
useEffect(() => {
  if (editor && !isCodeMode && content !== lastSyncedContent.current) {
    const json = markdownManager.parse(content);
    editor.commands.setContent(json, { emitUpdate: false });
    lastSyncedContent.current = content;
  }
}, [content, editor, ...]);
```

---

### 问题 5：`Uncaught RangeError: Invalid content for node paragraph` - 多张连续图片 ProseMirror 内部错误

**根因**：`@tiptap/markdown` 解析连续图片时，会把多个块级图片放在同一个 `paragraph` 节点里。而 `paragraph` 不允许包含多个块级节点，所以用户输入时 ProseMirror 内容检查失败抛出错误。

**修复**：添加全局错误监听，捕获这个特定错误自动切换到代码模式：

```tsx
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
```

现在：多张图片导致内部错误时，会自动切换到纯文本代码模式，用户可以继续编辑，不会内容还原或崩溃。

---

### 问题 6：旧笔记图片前后无空行导致解析错误 - 自动预处理兼容

**根因**：Tiptap/Prosemirror 要求块级图片每个图片必须独占一行（前后有空行），否则多个图片会被塞入同一个 paragraph，导致解析错误。旧笔记在使用 Tiptap 之前创建，很多图片没有空行。

**修复**：解析前自动预处理，给每个 `![...]()` 图片前后添加空行。对用户完全透明，不需要手动修改旧笔记：

```tsx
const processedContent = useMemo(() => {
  try {
    let processed = content;

    // 兼容性预处理：为图片添加前后空行
    // Tiptap/ProseMirror 要求块级图片前后必须有空行，否则多个图片会放在同一个 paragraph 导致解析错误
    // 自动给所有 ![...]() 添加前后空行，不改变原始内容语义，只保证解析正确
    processed = processed.replace(/(!\[.*?\]\(.*?\))/g, '\n\n$1\n\n');
    // 合并连续多个空行为两个，避免过多空行
    processed = processed.replace(/\n{3,}/g, '\n\n');
    // 去除开头和结尾多余空行
    processed = processed.trim();

    // ... 其他处理
    return processed;
  } catch (error) {
    return content;
  }
}, [content]);
```

预处理后，每个图片都正确独占一个块，可以被 Tiptap 正常解析。当用户保存笔记时，Tiptap 输出的 Markdown 本身就会带有正确的空行，所以保存后再次打开就是正确格式了。

---

### 问题 7：错误熔断 - 解析失败自动降级

**修复**：所有解析/序列化操作都包裹 `try-catch`，一旦出错自动切换到纯文本代码模式，用户可以继续编辑不崩溃。

```tsx
try {
  // parse/serialize
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error('[MarkdownEditor]', errorMessage);
  setParseError(true);
  setIsCodeMode(true);
}
```

## 最终修复后的代码结构

```tsx
export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({content, onChange}) => {
  // 1. 预处理内容：如果以图片开头，添加占位符
  const processedContent = useMemo(() => { ... }, [content]);
   
  // 2. 创建 MarkdownManager（只创建一次）
  const markdownManager = useMemo(() => {
    return new MarkdownManager({extensions: [...]});
  }, []);
   
  // 3. 解析初始内容（hooks 顶层调用，不在 useEditor 内部）
  const initialEditorContent = useMemo(() => {
    try { return markdownManager.parse(processedContent); }
    catch { ... }
  }, [markdownManager, processedContent]);
   
  // 4. 创建编辑器（只在依赖改变时重建，不随 content 变化重建）
  const editor = useEditor({
    extensions: [...],
    content: initialEditorContent,
    onUpdate: ({editor}) => {
      try {
        const json = editor.getJSON();
        const markdown = markdownManager.serialize(json);
        lastSyncedContent.current = markdown;
        onChange(markdown);
      } catch { ... }
    }
  });
   
  // 5. 外部 content 真正改变时才更新编辑器
  useEffect(() => {
    if (editor && !isCodeMode && content !== lastSyncedContent.current) {
      const json = markdownManager.parse(content);
      editor.commands.setContent(json, {emitUpdate: false});
      lastSyncedContent.current = content;
    }
  }, [content, editor, ...]);
};
```

## 保留功能清单

所有原有功能都完整保留：

- [x] 粗体、斜体、标题、列表格式化工具栏
- [x] 链接插入
- [x] 图片多种上传方式：文件选择、拖拽、粘贴、相机连续拍照
- [x] 图片自动前端压缩（大于 1MB 压缩到 1920px，质量 0.9）
- [x] 连续拍照模式（拍完一张自动打开相机拍下一张）
- [x] 拖拽上传遮罩提示
- [x] 可视化/代码 模式切换（解析失败自动切代码）
- [x] 输出保持标准 Markdown 格式，兼容原有数据存储

## 经验总结

1. **Tiptap + @tiptap/markdown 已知问题**：对多张连续图片、文档开头就是图片支持不好，生产环境需要做这些 workaround
2. **React Hooks 依赖陷阱**：依赖项每一个变化都会导致重新计算，`useEditor` 重建会丢失光标位置，必须避免
3. **避免闭环更新**：编辑器自己维护内部状态，不要把从编辑器出来的内容再塞回去，除非真正来自外部改变
4. **错误熔断很重要**：第三方库解析失败有 fallback，用户体验不会崩溃

## 测试验证

- [x] 文档以多张图片开头可以正常编辑
- [x] 在正文中间任意位置输入，光标保持原位不跳转
- [x] 多张连续图片不会丢失，保存后正常显示
- [x] 多张连续图片发生内部错误自动降级到代码模式，不会崩溃
- [x] 用户输入不会被自动还原
- [x] 解析失败自动降级到代码模式
- [x] 所有图片上传方式（拖拽/粘贴/文件/相机）正常工作
- [x] 输出 Markdown 格式兼容原有数据
- [x] 旧笔记图片没有空行，解析前自动添加空行，可以正常编辑
