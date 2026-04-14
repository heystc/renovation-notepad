import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import crypto from 'crypto';
import { exec } from 'child_process';

// Git 可执行文件路径
// 如果 Node.js 找不到 git 命令，修改这里为绝对路径（用 `which git` 查找）
const GIT_PATH = process.env.GIT_PATH || 'git';

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

// --- 用户认证 ---
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// 默认用户
const DEFAULT_USERS = {
  users: [
    {
      username: 'admin',
      passwordHash: crypto.createHash('sha256').update('admin').digest('hex'),
      isAdmin: true
    }
  ]
};

// 读取用户数据
const readUsers = () => {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), 'utf-8');
    return DEFAULT_USERS;
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
};

// 验证 token (简单实现：token 存在于会话中)
// 存储 token -> username 映射
const tokenMap = new Map();

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未授权' });
  }
  const token = authHeader.substring(7);
  if (!tokenMap.has(token)) {
    return res.status(401).json({ success: false, message: '令牌无效或已过期' });
  }
  // 将用户名绑定到请求
  req.user = { username: tokenMap.get(token) };
  next();
};

// 密码哈希
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

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
    const parsed = JSON.parse(content);
    // 向后兼容：如果没有appName，添加默认值
    if (!parsed.appName) {
      parsed.appName = '装修记事本';
    }
    // 向后兼容：如果没有logo，添加默认值
    if (!parsed.hasOwnProperty('logo')) {
      parsed.logo = null;
    }
    // 向后兼容：rooms → tags，如果tags不存在，使用rooms数据
    if (!parsed.tags && parsed.rooms) {
      parsed.tags = parsed.rooms;
    }
    // 确保tags存在
    if (!parsed.tags) {
      parsed.tags = [
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
      ];
    }
    // 向后兼容：如果没有tagGroups，但是有tags，转换为默认分组
    if (!parsed.tagGroups && parsed.tags) {
      parsed.tagGroups = [
        {
          id: 'default',
          name: '默认分组',
          icon: 'home',
          enableFilter: true,
          tags: parsed.tags
        }
      ];
    }
    // 确保tagGroups存在
    if (!parsed.tagGroups) {
      parsed.tagGroups = [
        {
          id: 'default',
          name: '默认分组',
          icon: 'home',
          enableFilter: true,
          tags: parsed.tags
        }
      ];
    }
    // 向后兼容：为每个分组确保 icon 字段存在
    parsed.tagGroups = parsed.tagGroups.map(group => {
      if (!group.hasOwnProperty('icon')) {
        return { ...group, icon: 'home' };
      }
      return group;
    });
    return parsed;
  }
  return {
    version: '1.0',
    lastModified: new Date().toISOString(),
    appName: '装修记事本',
    logo: null,
    categories: [
      { id: 'idea', label: '灵感', color: 'bg-amber-100 text-amber-700' },
      { id: 'product', label: '产品', color: 'bg-blue-100 text-blue-700' },
      { id: 'cost', label: '费用', color: 'bg-green-100 text-green-700' },
      { id: 'file', label: '文件', color: 'bg-purple-100 text-purple-700' },
      { id: 'image', label: '图片', color: 'bg-pink-100 text-pink-700' }
    ],
    tags: [
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
    tagGroups: [
      {
        id: 'default',
        name: '空间',
        enableFilter: true,
        tags: [
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
        ]
      }
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

// 用户登录
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    const usersData = readUsers();
    const user = usersData.users.find(u => u.username === username);

    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const passwordHash = hashPassword(password);
    if (passwordHash !== user.passwordHash) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    // 生成随机 token
    const token = crypto.randomBytes(32).toString('hex');
    tokenMap.set(token, username);

    res.json({
      success: true,
      token,
      username: user.username,
      isAdmin: user.isAdmin
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

// 获取当前用户信息
app.get('/api/me', authMiddleware, (req, res) => {
  const usersData = readUsers();
  const user = usersData.users.find(u => u.username === req.user.username);
  res.json({
    success: true,
    username: req.user.username,
    isAdmin: user?.isAdmin || false
  });
});

// 验证 token
app.post('/api/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ success: false, message: '未授权' });
  }
  const token = authHeader.substring(7);
  if (tokenMap.has(token)) {
    const username = tokenMap.get(token);
    const usersData = readUsers();
    const user = usersData.users.find(u => u.username === username);
    res.json({ success: true, valid: true, isAdmin: user?.isAdmin || false });
  } else {
    res.json({ success: true, valid: false });
  }
});

// 用户登出
app.post('/api/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    tokenMap.delete(token);
  }
  res.json({ success: true, message: '登出成功' });
});

// 获取所有笔记
app.get('/api/notes', authMiddleware, (req, res) => {
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
      creator: metadata.creator,
      createdAt: metadata.createdAt,
      updater: metadata.updater,
      updatedAt: metadata.updatedAt,
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
app.post('/api/notes', authMiddleware, (req, res) => {
  try {
    const { category, title, content, room, rooms, progress, budget, actualCost } = req.body;
    const creator = req.user.username;
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const markdownFile = generateReadableFilename(title, id);
    const now = new Date().toISOString();

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
      actualCost,
      creator,
      createdAt: now,
      updater: creator,
      updatedAt: now
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
      creator,
      createdAt: now,
      updater: creator,
      updatedAt: now,
      markdownFile
    };

    // 更新索引
    const index = readNotesIndex();
    index.notes.unshift(metadata);
    writeNotesIndex(index);

    // 写入 Markdown 文件（包含标题）
    writeMarkdownFile(markdownFile, title, content);

    // 自动git commit
    autoGitCommit(markdownFile, title, 'Create');

    res.json({ success: true, note: newNote });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create note' });
  }
});

// 更新笔记
app.put('/api/notes/:id', authMiddleware, (req, res) => {
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
    // 更新修改者和修改时间
    const updater = req.user.username;
    metadata.updater = updater;
    metadata.updatedAt = new Date().toISOString();

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
      room: metadata.room,
      rooms: metadata.rooms,
      tags: metadata.tags,
      creator: metadata.creator,
      createdAt: metadata.createdAt,
      updater: metadata.updater,
      updatedAt: metadata.updatedAt,
      content: content !== undefined ? content : readMarkdownFile(metadata.markdownFile)
    };

    // 自动git commit
    autoGitCommit(metadata.markdownFile, metadata.title, 'Update');

    res.json({ success: true, note: updatedNote });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update note' });
  }
});

// 删除笔记
app.delete('/api/notes/:id', authMiddleware, (req, res) => {
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
app.post('/api/import/markdown', authMiddleware, (req, res) => {
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
app.post('/api/import/batch', authMiddleware, (req, res) => {
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
app.get('/api/status', authMiddleware, (req, res) => {
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
app.get('/api/settings', authMiddleware, (req, res) => {
  try {
    const settings = readSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to read settings' });
  }
});

// 更新设置
app.put('/api/settings', authMiddleware, (req, res) => {
  try {
    const { appName, logo, categories, tags, tagGroups, statuses } = req.body;
    const settings = readSettings();

    if (appName !== undefined) settings.appName = appName;
    if (logo !== undefined) settings.logo = logo;
    if (categories) settings.categories = categories;
    if (tags) settings.tags = tags;
    if (tagGroups) settings.tagGroups = tagGroups;
    if (statuses) settings.statuses = statuses;

    writeSettings(settings);

    // 自动git commit settings.json
    autoGitCommit('settings.json', 'Update settings', 'Update');

    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

// 上传图片
app.post('/api/upload', authMiddleware, upload.single('image'), (req, res) => {
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
app.delete('/api/upload/:filename', authMiddleware, (req, res) => {
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

// --- 用户管理 API ---

// 获取用户列表
app.get('/api/users', authMiddleware, (req, res) => {
  try {
    const usersData = readUsers();
    // 返回用户列表，不返回密码哈希
    const users = usersData.users.map(u => ({
      username: u.username,
      isAdmin: u.isAdmin
    }));
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ success: false, message: 'Failed to get users' });
  }
});

// 创建用户
app.post('/api/users', authMiddleware, (req, res) => {
  try {
    const { username, password, isAdmin } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    const usersData = readUsers();

    // 检查用户名是否已存在
    if (usersData.users.find(u => u.username === username)) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    const newUser = {
      username,
      passwordHash: hashPassword(password),
      isAdmin: isAdmin || false
    };

    usersData.users.push(newUser);
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2), 'utf-8');

    res.json({
      success: true,
      user: { username: newUser.username, isAdmin: newUser.isAdmin }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

// 删除用户
app.delete('/api/users/:username', authMiddleware, (req, res) => {
  try {
    const { username } = req.params;
    const currentUsername = req.auth?.username; // 这里暂时不需要，前端控制不能删自己

    if (username === 'admin') {
      return res.status(400).json({ success: false, message: '不能删除默认admin用户' });
    }

    const usersData = readUsers();
    usersData.users = usersData.users.filter(u => u.username !== username);
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2), 'utf-8');

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// 修改用户信息（修改isAdmin）
app.put('/api/users/:username', authMiddleware, (req, res) => {
  try {
    const { username } = req.params;
    const { isAdmin } = req.body;

    const usersData = readUsers();
    const userIndex = usersData.users.findIndex(u => u.username === username);

    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    usersData.users[userIndex].isAdmin = isAdmin;
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2), 'utf-8');

    res.json({
      success: true,
      user: {
        username: usersData.users[userIndex].username,
        isAdmin: usersData.users[userIndex].isAdmin
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

// 修改密码（当前登录用户修改自己的密码）
app.post('/api/change-password', authMiddleware, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const username = req.user.username;

    const usersData = readUsers();
    const user = usersData.users.find(u => u.username === username);

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    // 验证旧密码
    if (hashPassword(oldPassword) !== user.passwordHash) {
      return res.status(401).json({ success: false, message: '原密码错误' });
    }

    // 更新密码
    user.passwordHash = hashPassword(newPassword);
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2), 'utf-8');

    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

// 获取单个笔记
app.get('/api/notes/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const index = readNotesIndex();
    const metadata = index.notes.find(n => n.id === id);

    if (!metadata) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    const note = {
      id: metadata.id,
      category: metadata.category,
      title: metadata.title,
      date: metadata.date,
      isPinned: metadata.isPinned,
      room: metadata.room,
      rooms: metadata.rooms,
      tags: metadata.tags,
      progress: metadata.progress,
      budget: metadata.budget,
      actualCost: metadata.actualCost,
      creator: metadata.creator,
      createdAt: metadata.createdAt,
      updater: metadata.updater,
      updatedAt: metadata.updatedAt,
      content: readMarkdownFile(metadata.markdownFile)
    };

    res.json({ success: true, note });
  } catch (error) {
    console.error('Error reading note:', error);
    res.status(500).json({ success: false, message: 'Failed to read note' });
  }
});

// --- Git 版本历史 API ---

// 执行git命令
const execGit = (command, cwd = DATA_DIR) => {
  return new Promise((resolve, reject) => {
    exec(command, { cwd, timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Git error: ${error.message}`);
        reject(error);
      } else {
        resolve(stdout.trim());
      }
    });
  });
};

// 获取笔记的Git提交历史
app.get('/api/notes/:id/history', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const index = readNotesIndex();
    const metadata = index.notes.find(n => n.id === id);

    if (!metadata) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    const filePath = metadata.markdownFile;
    const fullPath = path.join(DATA_DIR, filePath);

    if (!fs.existsSync(fullPath)) {
      return res.json({ success: true, history: [] });
    }

    try {
      // 获取git log: 格式commit hash|date|message
      const output = await execGit(`${GIT_PATH} log --pretty=format:"%h|%ci|%s" -- "${filePath}"`);
      if (!output) {
        return res.json({ success: true, history: [] });
      }

      const history = output.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [hash, date, message] = line.split('|');
          return { hash, date, message };
        });

      res.json({ success: true, history });
    } catch (gitError) {
      // git未初始化或其他错误，返回空历史
      console.warn(`Git history unavailable: ${gitError.message}`);
      res.json({ success: true, history: [] });
    }
  } catch (error) {
    console.error('Error getting git history:', error);
    res.status(500).json({ success: false, message: 'Failed to get history' });
  }
});

// 获取指定commit的笔记内容
app.get('/api/notes/:id/content/:hash', authMiddleware, async (req, res) => {
  try {
    const { id, hash } = req.params;
    const index = readNotesIndex();
    const metadata = index.notes.find(n => n.id === id);

    if (!metadata) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    const filePath = metadata.markdownFile;

    try {
      const content = await execGit(`${GIT_PATH} show ${hash}:${filePath}`);
      // 去掉标题第一行（# 标题）
      const lines = content.split('\n');
      if (lines.length >= 2 && lines[0].startsWith('# ')) {
        const contentWithoutTitle = lines.slice(2).join('\n').trim();
        res.json({ success: true, content: contentWithoutTitle });
      } else {
        res.json({ success: true, content: content.trim() });
      }
    } catch (gitError) {
      console.error(`Git show error: ${gitError.message}`);
      res.status(500).json({ success: false, message: 'Failed to get content' });
    }
  } catch (error) {
    console.error('Error getting commit content:', error);
    res.status(500).json({ success: false, message: 'Failed to get content' });
  }
});

// 获取当前版本与指定commit的diff
app.get('/api/notes/:id/diff/:hash', authMiddleware, async (req, res) => {
  try {
    const { id, hash } = req.params;
    const index = readNotesIndex();
    const metadata = index.notes.find(n => n.id === id);

    if (!metadata) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    const filePath = metadata.markdownFile;

    try {
      const diff = await execGit(`${GIT_PATH} diff ${hash} HEAD -- "${filePath}"`);
      res.json({ success: true, diff });
    } catch (gitError) {
      console.error(`Git diff error: ${gitError.message}`);
      res.status(500).json({ success: false, message: 'Failed to get diff' });
    }
  } catch (error) {
    console.error('Error getting diff:', error);
    res.status(500).json({ success: false, message: 'Failed to get diff' });
  }
});

// 上传Logo
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `logo-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  }
});
const logoUpload = multer({ storage: logoStorage });

app.post('/api/settings/logo', authMiddleware, logoUpload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No logo file provided' });
    }

    const logoUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: logoUrl, filename: req.file.filename });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ success: false, message: 'Failed to upload logo' });
  }
});

// 自动git commit（在笔记创建/更新后调用）
const autoGitCommit = async (markdownFile, title, action = 'Update') => {
  try {
    // 检查git是否可用以及是否是git仓库
    await execGit(`${GIT_PATH} rev-parse --is-inside-work-tree`);
    // git add 文件
    await execGit(`${GIT_PATH} add "${markdownFile}" notes.json settings.json`);
    // 检查暂存区是否有变更
    const diff = await execGit(`${GIT_PATH} diff --cached --name-only`);
    if (diff.trim()) {
      // 有变更，提交
      const commitMessage = `${action} note: ${title}`;
      await execGit(`${GIT_PATH} commit -m "${commitMessage.replace(/"/g, '\\"')}"`);
      console.log(`✓ Git committed: ${commitMessage}`);
    } else {
      console.log(`Git: No staged changes to commit for ${markdownFile}`);
    }
  } catch (error) {
    // git不可用不影响主流程，输出错误帮助诊断
    console.log(`⚠️  Auto git commit skipped: ${error.message}`);
  }
};

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
