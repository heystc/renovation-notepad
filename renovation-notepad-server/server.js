import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// 数据存储目录
const DATA_DIR = path.join(__dirname, 'data');
// 图片上传目录
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// 确保目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 配置 multer 图片上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1025 // 5MB 限制
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
// 静态托管上传的图片
app.use('/uploads', express.static(UPLOAD_DIR));

// 读取 notes.json（索引文件）
const readNotesIndex = () => {
  const indexPath = path.join(DATA_DIR, 'notes.json');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf-8');
    return JSON.parse(content);
  }
  return {
    version: '1.0',
    lastModified: new Date().toISOString(),
    notes: []
  };
};

// 读取 settings.json
const readSettings = () => {
  const settingsPath = path.join(DATA_DIR, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    const content = fs.readFileSync(settingsPath, 'utf-8');
    return JSON.parse(content);
  }
  return {
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
};

// 写入 settings.json
const writeSettings = (settings) => {
  const settingsPath = path.join(DATA_DIR, 'settings.json');
  settings.lastModified = new Date().toISOString();
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
};

// 写入 notes.json
const writeNotesIndex = (index) => {
  const indexPath = path.join(DATA_DIR, 'notes.json');
  index.lastModified = new Date().toISOString();
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
};

// 读取 Markdown 文件（去掉标题）
const readMarkdownFile = (filename) => {
  const filePath = path.join(DATA_DIR, filename);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    // 去掉标题（以#开头的第一行）
    if (content.startsWith('# ')) {
      content = content.split('\n').slice(2).join('\n');
    }
    return content.trim();
  }
  return '';
};

// 写入 Markdown 文件（包含标题）
const writeMarkdownFile = (filename, title, content) => {
  const filePath = path.join(DATA_DIR, filename);
  const markdownContent = `# ${title}\n\n${content}`;
  fs.writeFileSync(filePath, markdownContent, 'utf-8');
};

// 删除 Markdown 文件
const deleteMarkdownFile = (filename) => {
  const filePath = path.join(DATA_DIR, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// --- API 路由 ---

// 获取所有笔记
app.get('/api/notes', (req, res) => {
  try {
    const index = readNotesIndex();
    const notes = index.notes.map(metadata => ({
      id: metadata.id,
      category: metadata.category,
      title: metadata.title,
      date: metadata.date,
      isPinned: metadata.isPinned,
      room: metadata.room,
      rooms: metadata.rooms,
      progress: metadata.progress,
      budget: metadata.budget,
      actualCost: metadata.actualCost,
      content: readMarkdownFile(metadata.markdownFile)
    }));
    res.json({ success: true, notes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to read notes' });
  }
});

// 生成可读的文件名
const generateReadableFilename = (title, id) => {
  // 简化标题，去除特殊字符，保留中英文和数字
  const simplifiedTitle = title
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '')  // 移除特殊字符
    .replace(/\s+/g, '-')  // 空格替换为连字符
    .replace(/-+/g, '-')  // 多个连字符合并
    .trim()
    .substring(0, 50);  // 限制长度

  // 如果标题为空或简化后为空，使用默认名称
  const safeTitle = simplifiedTitle || '未命名笔记';

  return `${safeTitle}-${id}.md`;
};

// 创建新笔记
app.post('/api/notes', (req, res) => {
  try {
    const { category, title, content, room, rooms, progress, budget, actualCost } = req.body;
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const markdownFile = generateReadableFilename(title, id);

    const newNote = {
      id,
      category: category || 'idea',
      title,
      content,
      isPinned: false,
      date: new Date().toISOString().split('T')[0],
      room: rooms && rooms.length > 0 ? rooms[0] : room,
      rooms: rooms || (room ? [room] : undefined),
      progress,
      budget,
      actualCost
    };

    const metadata = {
      id,
      category: newNote.category,
      title: newNote.title,
      date: newNote.date,
      isPinned: false,
      room: newNote.room,
      rooms: newNote.rooms,
      progress: newNote.progress,
      budget: newNote.budget,
      actualCost: newNote.actualCost,
      markdownFile
    };

    // 更新索引
    const index = readNotesIndex();
    index.notes.unshift(metadata);
    writeNotesIndex(index);

    // 写入 Markdown 文件（包含标题）
    writeMarkdownFile(markdownFile, title, content);

    res.json({ success: true, note: newNote });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create note' });
  }
});

// 更新笔记
app.put('/api/notes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { category, title, content, isPinned, room, rooms, progress, budget, actualCost } = req.body;

    const index = readNotesIndex();
    const metadataIndex = index.notes.findIndex(n => n.id === id);

    if (metadataIndex === -1) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    const metadata = index.notes[metadataIndex];

    // 更新元数据
    if (category) metadata.category = category;
    if (title) metadata.title = title;
    if (typeof isPinned === 'boolean') metadata.isPinned = isPinned;
    if (rooms !== undefined) {
      metadata.rooms = rooms;
      metadata.room = rooms && rooms.length > 0 ? rooms[0] : undefined;
    }
    if (room !== undefined && rooms === undefined) {
      metadata.room = room;
      metadata.rooms = room ? [room] : undefined;
    }
    if (progress) metadata.progress = progress;
    if (budget !== undefined) metadata.budget = budget;
    if (actualCost !== undefined) metadata.actualCost = actualCost;

    // 更新 Markdown 文件
    if (content !== undefined) {
      writeMarkdownFile(metadata.markdownFile, title || metadata.title, content);
    }

    writeNotesIndex(index);

    const updatedNote = {
      id: metadata.id,
      category: metadata.category,
      title: metadata.title,
      date: metadata.date,
      isPinned: metadata.isPinned,
      content: content !== undefined ? content : readMarkdownFile(metadata.markdownFile)
    };

    res.json({ success: true, note: updatedNote });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update note' });
  }
});

// 删除笔记
app.delete('/api/notes/:id', (req, res) => {
  try {
    const { id } = req.params;

    const index = readNotesIndex();
    const metadataIndex = index.notes.findIndex(n => n.id === id);

    if (metadataIndex === -1) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    const [metadata] = index.notes.splice(metadataIndex, 1);
    deleteMarkdownFile(metadata.markdownFile);
    writeNotesIndex(index);

    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete note' });
  }
});

// 导入单个Markdown文件
app.post('/api/import/markdown', (req, res) => {
  try {
    const { title, content, category = 'idea' } = req.body;

    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const markdownFile = generateReadableFilename(title, id);

    const newNote = {
      id,
      category,
      title,
      content,
      isPinned: false,
      date: new Date().toISOString().split('T')[0]
    };

    const metadata = {
      id,
      category: newNote.category,
      title: newNote.title,
      date: newNote.date,
      isPinned: false,
      markdownFile
    };

    // 更新索引
    const index = readNotesIndex();
    index.notes.unshift(metadata);
    writeNotesIndex(index);

    // 写入 Markdown 文件
    writeMarkdownFile(markdownFile, title, content);

    res.json({ success: true, note: newNote });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to import Markdown' });
  }
});

// 批量导入Markdown文件（通过base64）
app.post('/api/import/batch', (req, res) => {
  try {
    const { files } = req.body; // [{ title, content, category }, ...]

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files to import' });
    }

    const importedNotes = [];
    const index = readNotesIndex();

    files.forEach(file => {
      const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
      const markdownFile = generateReadableFilename(file.title, id);

      const newNote = {
        id,
        category: file.category || 'idea',
        title: file.title,
        content: file.content,
        isPinned: false,
        date: new Date().toISOString().split('T')[0]
      };

      const metadata = {
        id,
        category: newNote.category,
        title: newNote.title,
        date: newNote.date,
        isPinned: false,
        markdownFile
      };

      index.notes.unshift(metadata);
      writeMarkdownFile(markdownFile, file.title, file.content);
      importedNotes.push(newNote);
    });

    writeNotesIndex(index);
    res.json({ success: true, notes: importedNotes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to import files' });
  }
});

// 获取服务器状态
app.get('/api/status', (req, res) => {
  const index = readNotesIndex();
  res.json({
    success: true,
    status: 'running',
    dataDir: DATA_DIR,
    noteCount: index.notes.length,
    lastModified: index.lastModified
  });
});

// 获取设置
app.get('/api/settings', (req, res) => {
  try {
    const settings = readSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to read settings' });
  }
});

// 更新设置
app.put('/api/settings', (req, res) => {
  try {
    const { categories, rooms, statuses } = req.body;
    const settings = readSettings();

    if (categories) settings.categories = categories;
    if (rooms) settings.rooms = rooms;
    if (statuses) settings.statuses = statuses;

    writeSettings(settings);
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

// 上传图片
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      url: imageUrl,
      filename: req.file.filename,
      originalname: req.file.originalname
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image'
    });
  }
});

// 删除图片
app.delete('/api/upload/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(UPLOAD_DIR, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: 'Image deleted'
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image'
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 装修记事本后端服务已启动`);
  console.log(`📡 API地址: http://localhost:${PORT}`);
  console.log(`📁 数据目录: ${DATA_DIR}`);
  console.log(`🖼️  图片上传目录: ${UPLOAD_DIR}`);
  console.log(`\n可用的API端点:`);
  console.log(`  GET  /api/status        - 服务器状态`);
  console.log(`  GET  /api/notes         - 获取所有笔记`);
  console.log(`  POST /api/notes         - 创建新笔记`);
  console.log(`  PUT  /api/notes/:id     - 更新笔记`);
  console.log(`  DELETE /api/notes/:id   - 删除笔记`);
  console.log(`  POST /api/upload        - 上传图片`);
  console.log(`  DELETE /api/upload/:filename - 删除图片`);
  console.log(`  GET  /api/settings       - 获取设置`);
  console.log(`  PUT  /api/settings       - 更新设置`);
});
