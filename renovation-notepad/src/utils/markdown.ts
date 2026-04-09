/**
 * 渲染 Markdown 为 HTML
 * 使用 CSS 类代替内联样式，样式在 index.css 中定义
 */
export const renderMarkdown = (md: string): string => {
  if (!md) return '';

  let html = md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/~~(.*?)~~/gim, '<del>$1</del>')
    // Handle images first - ![alt](url)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<div><img src="$2" alt="$1" /></div>')
    // Then handle regular links
    .replace(/\[([^\]]*)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  const lines = html.split('\n');
  let inList = false;
  const processed: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('* ') || line.startsWith('- ')) {
      if (!inList) {
        processed.push('<ul>');
        inList = true;
      }
      processed.push(`<li>${line.substring(2)}</li>`);
    } else {
      if (inList) {
        processed.push('</ul>');
        inList = false;
      }
      if (line.trim()) {
        processed.push(`<p>${line}</p>`);
      }
    }
  }
  if (inList) {
    processed.push('</ul>');
  }

  return `<div class="markdown-body">${processed.join('')}</div>`;
};
