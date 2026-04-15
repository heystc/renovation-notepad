# 装修记事本 - 后端服务

装修记事本的后端 API 服务，使用 Express + 文件系统存储数据。

## 功能特点

- 📝 RESTful API 设计
- 💾 文件系统存储（JSON + Markdown）
- 🔌 CORS 支持
- 📄 Markdown 文件直接可读
- 🔄 支持笔记、设置、导入等完整功能

## 技术栈

- Node.js
- Express
- CORS
- body-parser
- 文件系统（fs）

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 本地开发

#### 1. 安装依赖

```bash
cd renovation-notepad-server
npm install
```

#### 2. 启动后端服务器

```bash
node server.js
```

或使用开发模式（需要安装 nodemon）：

```bash
npm install -g nodemon
npm run dev
```

服务器将在 `http://localhost:3001` 启动。

#### 3. 启动前端（新终端）

```bash
cd renovation-notepad
npm install
npm run dev
```

前端将在 `http://localhost:5173` 启动。

### 项目结构

```
renovation-notepad-server/
├── server.js                # 后端服务主文件
├── package.json
├── data/                    # 数据存储目录（自动创建）
│   ├── notes.json           # 笔记索引
│   ├── settings.json        # 系统设置
│   └── note-*.md            # 笔记内容文件
└── README.md
```

## 部署到 Linux 服务器

### 1. 准备工作

确保您的 Linux 服务器已安装：
- Node.js 18+
- npm 或 yarn
- Git（可选，用于代码拉取）

### 2. 上传代码

将后端代码上传到服务器，例如：

```bash
# 使用 Git 拉取（推荐）
cd /var/www
git clone <your-repo-url> renovation-notepad-server

# 或直接上传文件到 /var/www/renovation-notepad-server
```

### 3. 安装依赖并配置

```bash
# 进入后端目录
cd /var/www/renovation-notepad-server

# 安装依赖
npm install

# 确保数据目录存在
mkdir -p data

# 设置目录权限（确保 Node.js 可以读写）
chmod 755 data
```

### 4. 使用 PM2 管理进程（推荐）

PM2 是一个 Node.js 进程管理器，可以确保服务持续运行。

```bash
# 安装 PM2
npm install -g pm2

# 启动后端服务
pm2 start server.js --name renovation-backend

# 查看服务状态
pm2 status

# 查看日志
pm2 logs renovation-backend

# 设置开机自启
pm2 startup
# 按照提示执行输出的命令

# 保存当前进程列表
pm2 save
```

### 5. 配置防火墙

如果使用防火墙，需要开放 3001 端口（或通过 Nginx 反向代理，见下文）：

```bash
# 如果直接访问后端（不推荐）
sudo ufw allow 3001/tcp

# 如果使用 Nginx 反向代理，只需开放 80/443
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 6. 配合 Nginx 反向代理（推荐）

建议使用 Nginx 作为反向代理，同时服务前端和后端。完整配置见前端项目的 README.md。

这里仅列出后端相关的配置：

```nginx
# 在 Nginx 配置中添加
location /api {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

### 7. 验证部署

检查服务是否正常运行：

```bash
# 测试本地 API
curl http://localhost:3001/api/status

# 应该返回类似：
# {"success":true,"status":"running","dataDir":"/var/www/renovation-notepad-server/data",...}
```

## 数据存储

所有笔记数据以 JSON + Markdown 格式存储在 `data/` 目录：

```
data/
├── notes.json          # 笔记索引（属性信息）
├── settings.json       # 系统设置
├── note-xxx.md         # 各笔记的 Markdown 内容
├── note-yyy.md
└── ...
```

### notes.json 格式

```json
{
  "version": "1.0",
  "lastModified": "2026-04-03T...",
  "notes": [
    {
      "id": "xxx",
      "category": "idea",
      "title": "标题",
      "date": "2026-04-03",
      "isPinned": false,
      "room": "living",
      "rooms": ["living", "kitchen"],
      "progress": "todo",
      "budget": 5000,
      "actualCost": 4800,
      "markdownFile": "note-xxx.md"
    }
  ]
}
```

### settings.json 格式

```json
{
  "version": "1.0",
  "lastModified": "2026-04-03T...",
  "appName": "装修笔记本",
  "logo": null,
  "categories": [...],
  "statuses": [...],
  "tagGroups": [...]
}
```

### users.json 格式及示例数据
```json
{
  "users": [
    {
      "username": "admin",
      "passwordHash": "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",//admin
      "isAdmin": true
    }
  ]
}
```

### Markdown 文件格式

每个笔记的内容存储在单独的 Markdown 文件中：

```markdown
# 笔记标题

这里是笔记的 Markdown 内容...
```

### 数据备份

建议定期备份 `data/` 目录：

```bash
# 创建备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/renovation-notepad"
DATA_DIR="/var/www/renovation-notepad-server/data"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $DATA_DIR .

# 保留最近 30 天的备份
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +30 -delete
EOF

chmod +x backup.sh

# 添加到 crontab 每天凌晨 2 点备份
crontab -e
# 添加：0 2 * * * /var/www/renovation-notepad-server/backup.sh
```

## API 端点

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/status` | 服务器状态 |
| GET | `/api/notes` | 获取所有笔记 |
| POST | `/api/notes` | 创建新笔记 |
| PUT | `/api/notes/:id` | 更新笔记 |
| DELETE | `/api/notes/:id` | 删除笔记 |
| GET | `/api/notes/:id/history` | 获取笔记 Git 修改历史 |
| GET | `/api/notes/:id/content/:hash` | 获取指定 commit 的笔记内容 |
| GET | `/api/notes/:id/diff/:hash` | 获取当前与指定 commit 的差异对比 |
| GET | `/api/settings` | 获取系统设置 |
| PUT | `/api/settings` | 更新系统设置 |
| POST | `/api/settings/logo` | 上传 Logo |
| POST | `/api/import/markdown` | 导入单个 Markdown |
| POST | `/api/import/batch` | 批量导入 Markdown |
| POST | `/api/upload` | 上传图片 |
| DELETE | `/api/upload/:filename` | 删除图片 |

### API 示例

#### 获取所有笔记

```bash
curl http://localhost:3001/api/notes
```

#### 创建新笔记

```bash
curl -X POST http://localhost:3001/api/notes \
  -H "Content-Type: application/json" \
  -d '{
    "category": "idea",
    "title": "新笔记",
    "content": "笔记内容",
    "rooms": ["living", "kitchen"],
    "progress": "todo",
    "budget": 5000
  }'
```

## 工作流程

1. **新建笔记** → 前端调用 `POST /api/notes` → 后端创建：
   - 更新 `notes.json` 添加新笔记的元数据
   - 创建 `note-{id}.md` 保存笔记内容

2. **读取笔记** → 前端调用 `GET /api/notes` → 后端：
   - 读取 `notes.json` 获取所有笔记属性
   - 读取对应的 `.md` 文件获取内容
   - 返回完整的笔记数据

3. **更新笔记** → 前端调用 `PUT /api/notes/:id` → 后端：
   - 更新 `notes.json` 中的元数据
   - 更新对应的 `.md` 文件内容

4. **删除笔记** → 前端调用 `DELETE /api/notes/:id` → 后端：
   - 从 `notes.json` 中删除元数据
   - 删除对应的 `.md` 文件

## 优势

- ✅ **人类可读**：Markdown 文件可以直接编辑
- ✅ **版本友好**：适合用 Git 管理
- ✅ **分离关注**：属性（JSON）与内容（Markdown）分离
- ✅ **持久化**：数据保存在文件系统，重启不丢失
- ✅ **易于备份**：直接复制 data 目录即可

## 版本历史管理（Git 集成）

本项目内置了基于 Git 的自动版本历史管理功能。每次新建或编辑笔记后，会自动提交变更到 Git，用户可以在前端查看修改历史、对比不同版本。

### 前置条件

要启用版本历史功能，需要满足：

1. **系统已安装 Git**，并且 Git 可执行文件在 PATH 中
   ```bash
   # 检查 Git 是否安装
   git --version
   ```

2. **`data/` 目录已经初始化为 Git 仓库**
   ```bash
   cd data
   git init
   git add .
   git commit -m "Initial commit"
   cd ..
   ```

3. **Node.js 进程有 Git 执行权限**（一般默认就有）

如果不满足上述条件，版本历史功能会自动静默跳过，**不影响笔记的新建/编辑/删除等主功能**。

### 工作原理

- 每次新建笔记 → 自动 `git add` + `git commit -m "Create note: ..."`
- 每次更新笔记 → 自动 `git add` + `git commit -m "Update note: ..."`
- 每次修改设置 → 自动 `git add settings.json` + `git commit`
- 前端在笔记详情页可以点击"修改历史"查看所有提交记录
- 可以查看历史版本内容，也可以对比当前版本与历史版本的差异

### 禁用版本历史

如果不需要这个功能，什么都不用做。只要 Git 不可用，它会自动不工作，也不会输出错误信息。

## 常用维护命令

### PM2 相关

```bash
# 查看所有服务状态
pm2 status

# 查看后端日志
pm2 logs renovation-backend

# 查看实时日志
pm2 logs renovation-backend --follow

# 重启后端服务
pm2 restart renovation-backend

# 停止后端服务
pm2 stop renovation-backend

# 启动后端服务
pm2 start renovation-backend
```

### 手动启动（不使用 PM2）

```bash
# 前台运行
node server.js

# 后台运行（使用 nohup）
nohup node server.js > app.log 2>&1 &
```

## 故障排除

### 端口被占用

如果 3001 端口被占用，可以修改 `server.js` 中的端口号：

```javascript
const PORT = 3001;  // 修改为其他端口
```

或者查找并终止占用端口的进程：

```bash
# 查找占用 3001 端口的进程
lsof -i :3001
# 或
netstat -tlnp | grep 3001

# 终止进程
kill -9 <PID>
```

### 权限问题

确保 Node.js 进程有权读写 data 目录：

```bash
# 检查目录权限
ls -la data/

# 修改权限
chown -R www-data:www-data data/  # 如果使用 www-data 用户
# 或
chmod 755 data/
chmod 644 data/*.json
chmod 644 data/*.md
```

### 日志查看

```bash
# PM2 日志
pm2 logs renovation-backend

# 系统日志
tail -f /var/log/syslog
```

### Git 版本历史不工作

如果版本历史功能不工作，检查：

1. **Git 是否安装**
   ```bash
   git --version
   # 如果提示 command not found，需要先安装 Git
   ```

2. **data 目录是否初始化为 Git 仓库**
   ```bash
   cd data
   git status
   # 如果提示 fatal: not a git repository，需要初始化：
   git init
   git add .
   git commit -m "Initial commit"
   ```

3. **权限问题** - 确保 Node.js 可以执行 git 命令并且有写入权限

**注意**：即使 Git 版本历史不可用，核心笔记功能完全不受影响，只是不能查看修改历史而已。

## 许可证

MIT License
