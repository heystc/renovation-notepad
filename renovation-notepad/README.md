# 装修记事本

一款专为装修设计的笔记管理应用，帮助您记录装修过程中的灵感、产品信息、预算支出等。

## 功能特点

### 📝 笔记管理
- **Markdown 富文本编辑**：支持 Markdown 格式的内容编辑，提供便捷的工具栏
- **笔记分类**：灵感、产品、费用、文件、图片等多种分类
- **笔记置顶**：重要笔记可置顶显示
- **新标签页打开**：点击笔记卡片在新浏览器标签页中打开，支持 URL 分享

### 🏠 房间关联
- **多房间选择**：一个笔记可关联多个房间
- **预设房间**：客厅、厨房、餐厅、客卫、主卧、主卫、书房、男孩房、女孩房、阳台
- **自定义房间**：支持在设置中添加、编辑、删除房间

### 📊 进度与预算
- **进度状态**：待办、进行中、已完成三种状态
- **预算管理**：记录预算金额和实际花费
- **超支提醒**：实际花费超过预算时自动高亮显示

### 🏷️ 标签系统
- **标签分组**：支持将标签分组管理，可自定义分组名称和图标
- **分组筛选**：启用筛选的分组会在首页显示筛选栏，方便快速筛选
- **图标选择**：内置丰富图标库，可为分组和标签选择图标
- **灵活组织**：支持展开/折叠分组，灵活组织标签结构

### ⚙️ 系统设置
- **分类管理**：自定义笔记分类和颜色
- **房间管理**：自定义房间名称和图标
- **状态管理**：自定义进度状态和颜色
- **用户管理**：支持多用户登录，管理员可添加删除用户、设置管理员权限
- **Logo 自定义**：支持上传自定义 Logo，个性化应用

### 📥 批量导入
- **Markdown 导入**：支持批量导入 .md 文件
- **自动解析**：自动识别 Markdown 文件标题

### 🕒 版本历史
- **Git 集成**：内置基于 Git 的自动版本历史管理
- **自动提交**：每次编辑笔记后自动提交变更
- **历史查看**：在笔记详情页可查看所有修改历史
- **差异对比**：支持对比当前版本与历史版本的差异

## 技术栈

### 前端
- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios
- Lucide React（图标库）

### 后端
- Node.js
- Express
- CORS
- 文件系统存储（JSON + Markdown）

## 快速开始

### 环境要求
- Node.js 18+
- npm 或 yarn

### 本地开发

#### 1. 启动后端服务

```bash
cd renovation-notepad-server
npm install
node server.js
```

后端服务将在 http://localhost:3001 启动

#### 2. 启动前端服务

```bash
cd renovation-notepad
npm install
npm run dev
```

前端服务将在 http://localhost:5173 启动（或自动选择可用端口）

### 项目结构

```
.
├── renovation-notepad/          # 前端项目
│   ├── src/
│   │   ├── App.tsx             # 主应用组件
│   │   └── main.tsx            # 应用入口
│   ├── dist/                    # 构建产物（执行 npm run build 后生成）
│   ├── package.json
│   └── vite.config.ts
└── renovation-notepad-server/   # 后端项目
    ├── server.js                # 后端服务
    ├── data/                    # 数据存储目录（自动创建）
    │   ├── notes.json           # 笔记索引
    │   ├── settings.json        # 系统设置
    │   └── note-*.md            # 笔记内容文件
    └── package.json
```

## 部署到 Linux 服务器

### 1. 准备工作

确保您的 Linux 服务器已安装：
- Node.js 18+
- npm 或 yarn
- Nginx（用于反向代理）
- Git（可选，用于代码拉取）

### 2. 部署后端服务

```bash
# 1. 上传后端代码到服务器
# 假设上传到 /var/www/renovation-notepad-server

# 2. 进入后端目录
cd /var/www/renovation-notepad-server

# 3. 安装依赖
npm install

# 4. 确保数据目录存在
mkdir -p data

# 5. 使用 PM2 管理进程（推荐）
npm install -g pm2

# 6. 启动后端服务
pm2 start server.js --name renovation-backend

# 7. 设置开机自启
pm2 startup
pm2 save
```

### 3. 构建并部署前端

#### 修改前端 API 地址

在 `src/App.tsx` 中，将 API  baseURL 改为相对路径：

```typescript
const api = axios.create({
  baseURL: '/api',  // 使用相对路径
  timeout: 10000,
});
```

#### 构建前端

```bash
# 在本地或服务器上构建前端
cd /var/www/renovation-notepad
npm install
npm run build

# 构建产物在 dist 目录中
```

### 4. 配置 Nginx

创建 Nginx 配置文件 `/etc/nginx/sites-available/renovation-notepad`：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为您的域名或服务器IP

    # 前端静态文件
    location / {
        root /var/www/renovation-notepad/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # API 代理到后端
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
}
```

启用配置：

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/renovation-notepad /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 5. 配置防火墙

```bash
# 允许 HTTP 和 HTTPS 流量
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 6. （可选）配置 SSL 证书（使用 Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取并安装证书
sudo certbot --nginx -d your-domain.com
```

### 7. 目录结构建议

```
/var/www/
├── renovation-notepad/          # 前端项目
│   ├── dist/                    # 构建产物（Nginx 指向这里）
│   ├── src/
│   └── package.json
└── renovation-notepad-server/   # 后端项目
    ├── data/                    # 数据存储目录
    ├── server.js
    └── package.json
```

### 8. 常用维护命令

```bash
# 查看后端服务状态
pm2 status

# 查看后端日志
pm2 logs renovation-backend

# 重启后端服务
pm2 restart renovation-backend

# 更新代码后重新构建前端
cd /var/www/renovation-notepad
git pull  # 如果使用 git
npm install
npm run build
```

## API 接口

### 笔记相关

- `GET /api/notes` - 获取所有笔记
- `POST /api/notes` - 创建新笔记
- `PUT /api/notes/:id` - 更新笔记
- `DELETE /api/notes/:id` - 删除笔记

### 设置相关

- `GET /api/settings` - 获取系统设置
- `PUT /api/settings` - 更新系统设置

### 导入相关

- `POST /api/import/markdown` - 导入单个 Markdown 文件
- `POST /api/import/batch` - 批量导入 Markdown 文件

### 其他

- `GET /api/status` - 获取服务器状态

## 数据存储

应用使用文件系统存储数据：

- `notes.json` - 笔记索引文件，存储笔记元数据
- `settings.json` - 系统设置文件
- `note-{id}.md` - 单个笔记的 Markdown 内容文件

所有数据存储在后端的 `data` 目录中，建议定期备份该目录。

## 许可证

MIT License
