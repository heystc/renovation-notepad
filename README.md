# 装修记事本项目

一个专为装修设计的全栈应用，帮助用户记录装修过程中的设计灵感、产品信息、预算支出等，支持笔记在新标签页打开和分享。
支持自定义分类、标签组、状态等设置，自定义配置可以用于任何行业笔记
基于git实现了笔记版本管理功能

## 项目概述

这是一个现代化的装修管理工具，结合了直观的用户界面和强大的功能特性，让装修过程更加有序和高效。

## 技术架构

### 前端技术栈
- **React 19** - 用户界面框架
- **TypeScript** - 类型安全的 JavaScript 超集
- **Vite** - 快速的前端构建工具
- **Tailwind CSS** - 实用优先的 CSS 框架
- **React Router** - 单页面应用路由
- **Axios** - HTTP 请求库
- **Lucide React** - 现代化的图标库

### 后端技术栈
- **Node.js** - 服务器运行环境
- **Express** - Web 应用框架
- **CORS** - 跨域资源共享
- **文件系统存储** - JSON + Markdown 文件存储

## 项目结构

```
.
├── renovation-notepad/              # 前端项目
│   ├── src/
│   │   ├── App.tsx                 # 主应用组件
│   │   ├── main.tsx                # 应用入口
│   │   ├── index.css               # 全局样式
│   │   └── ...                     # 其他组件和工具
│   ├── dist/                       # 构建产物
│   ├── package.json                # 前端依赖配置
│   ├── vite.config.ts              # Vite 配置
│   ├── tailwind.config.js          # Tailwind 配置
│   └── ...                         # 其他配置文件
│
├── renovation-notepad-server/      # 后端项目
│   ├── server.js                   # 后端服务主文件
│   ├── data/                       # 数据存储目录（自动创建）
│   │   ├── notes.json              # 笔记索引
│   │   ├── settings.json           # 系统设置
│   │   └── note-*.md               # 笔记内容文件
│   ├── package.json                # 后端依赖配置
│   └── README.md                   # 后端文档
│
├── 装修记事本应用设计方案.md        # 完整的应用设计方案
├── 测试用例.md                     # 详细的功能测试用例
├── 测试计划.md                     # 项目测试计划
├── 测试检查表.md                   # 测试执行检查表
├── task_plan.md                    # 项目任务计划
├── findings.md                     # 问题发现和解决方案
├── progress.md                     # 项目进展记录
├── script/install.sh               # 自动化安装脚本
├── .gitignore                      # Git 忽略文件配置
└── README.md                       # 项目根目录说明文档（本文件）
```

## 功能特点

### 核心功能

✅ **笔记管理**
- Markdown 富文本编辑
- 笔记在新标签页打开，支持分享链接
- 笔记置顶功能
- 搜索和筛选功能

✅ **笔记属性管理**
- 分类管理（灵感、产品、费用、文件、图片等）
- 房间关联（支持多房间选择）
- 进度状态（待办、进行中、已完成）
- 预算管理（预算金额和实际花费）

✅ **系统设置**
- 自定义笔记分类
- 自定义房间信息
- 自定义进度状态
- 自定义标签分组
- 颜色配置
- Logo 个性化定制
- 多用户管理

✅ **标签系统**
- 标签分组管理
- 分组图标自定义
- 首页快速筛选
- 灵活的标签组织方式

✅ **版本历史**
- 基于 Git 的自动版本管理
- 每次编辑自动提交
- 历史版本查看
- 差异对比功能

✅ **导入导出功能**
- 批量导入 Markdown 文件
- 支持从文件夹导入
- 自动解析 Markdown 文件标题

✅ **图片上传**
- 支持图片上传到服务器
- 前端自动图片压缩
- 图片删除功能

✅ **数据存储**
- 文件系统存储（JSON + Markdown）
- 数据备份和恢复
- 支持多语言内容

✅ **多用户认证**
- 用户登录/登出
- 管理员权限管理
- 密码修改功能

## 快速开始

### 本地开发

#### 1. 启动后端服务

```bash
cd renovation-notepad-server
npm install
node server.js  # 或 npm run dev（需要安装 nodemon）
```

后端服务将在 http://localhost:3001 启动

#### 2. 启动前端服务

```bash
cd renovation-notepad
npm install
npm run dev
```

前端服务将在 http://localhost:5173 启动（或自动选择可用端口）

### 生产构建

```bash
# 前端构建
cd renovation-notepad
npm run build

# 服务器部署
# 参考 renovation-notepad/README.md 中的部署指南
```

## 部署说明

详细的部署指南请参考：
- `renovation-notepad/README.md` - 包含完整的 Linux 服务器部署步骤
- `renovation-notepad-server/README.md` - 后端部署和管理说明

## 数据存储

### 存储格式

应用使用文件系统存储数据，所有数据位于 `renovation-notepad-server/data/` 目录：

- **notes.json** - 笔记索引文件，存储笔记元数据
- **settings.json** - 系统设置文件，包含分类、房间、状态配置
- **note-*.md** - 单个笔记的 Markdown 内容文件

### 备份策略

建议定期备份 `data/` 目录，可使用 crontab 实现自动化备份：

```bash
# 每日自动备份脚本示例
0 2 * * * tar -czf /var/backups/renovation-notepad/backup_$(date +\%Y\%m\%d_\%H\%M\%S).tar.gz -C /var/www/renovation-notepad-server/data .
```

## API 接口

### 笔记相关

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/notes` | 获取所有笔记 |
| POST | `/api/notes` | 创建新笔记 |
| PUT | `/api/notes/:id` | 更新笔记 |
| DELETE | `/api/notes/:id` | 删除笔记 |

### 设置相关

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/settings` | 获取系统设置 |
| PUT | `/api/settings` | 更新系统设置 |

### 导入相关

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/import/markdown` | 导入单个 Markdown 文件 |
| POST | `/api/import/batch` | 批量导入 Markdown 文件 |

### 用户管理

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/users` | 获取用户列表 |
| POST | `/api/users` | 创建新用户 |
| PUT | `/api/users/:username` | 修改用户信息 |
| DELETE | `/api/users/:username` | 删除用户 |
| POST | `/api/change-password` | 修改当前用户密码 |

### 图片上传

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/upload` | 上传图片 |
| DELETE | `/api/upload/:filename` | 删除图片 |

### 版本历史

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/notes/:id/history` | 获取笔记修改历史 |
| GET | `/api/notes/:id/content/:hash` | 获取指定 commit 的笔记内容 |
| GET | `/api/notes/:id/diff/:hash` | 获取当前与指定 commit 的差异对比 |

### 其他

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/status` | 获取服务器状态 |
| POST | `/api/settings/logo` | 上传 Logo |

## 开发规范

### 编码规范

- **命名规范**：使用驼峰命名法（camelCase），变量名要有意义
- **代码风格**：使用 Prettier 格式化，遵循 ESLint 规则
- **类型安全**：使用 TypeScript，避免 any 类型
- **组件设计**：遵循 React 组件设计最佳实践

### 提交规范

```
<type>: <description>

[body]

[footer]
```

**类型说明：**
- `feat` - 新功能
- `fix` - 修复问题
- `docs` - 文档更新
- `style` - 代码格式
- `refactor` - 代码重构
- `test` - 测试相关
- `chore` - 构建过程或辅助工具的变动

## 测试说明

### 功能测试

详细的功能测试用例请参考 `测试用例.md` 文件，包含：

- 笔记管理功能
- 搜索和筛选功能
- 导入导出功能
- 系统设置功能
- 预算管理功能
- 多房间选择功能

### 测试计划

项目测试计划请参考 `测试计划.md` 文件，包含：

- 测试策略
- 测试环境配置
- 测试范围
- 测试进度安排
- 风险评估

### 测试执行

测试检查表请参考 `测试检查表.md` 文件，包含：

- 功能测试执行表
- 兼容性测试执行表
- 性能测试执行表
- 安全测试执行表

## 问题和解决方案

### 常见问题

#### 1. 笔记文件名可读性优化

**问题：** 原始文件名使用随机 ID，难以识别
**方案：** 使用标题简化 + 短 ID 的格式，如 `北欧风格电视背景墙设计-kg3h12jz.md`

#### 2. 笔记在新标签页打开

**问题：** 原始设计使用对话框，不便于分享
**方案：** 使用 React Router 路由，笔记详情页支持直接访问

#### 3. 多房间选择功能

**问题：** 原始设计仅支持单选房间
**方案：** 修改数据结构，使用数组存储房间信息

## 项目进展

详细的项目进展记录请参考 `progress.md` 文件，包含：

- 项目启动和计划阶段
- 前端开发阶段
- 后端开发阶段
- 功能测试阶段
- 部署和优化阶段

## 未来规划

### 功能增强

- [x] 支持图片上传和管理
- [x] 笔记标签功能（标签分组系统）
- [x] 笔记版本历史（Git 集成）
- [ ] 笔记分享功能优化
- [ ] 移动端适配
- [ ] 数据同步功能

### 技术优化

- [ ] 数据库存储（替代文件系统）
- [ ] 缓存优化
- [ ] 性能优化
- [ ] 安全优化
- [ ] 监控和日志系统

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：

- 项目负责人：[Your Name]
- 邮箱：[Your Email]
- 开发文档：[Your Documentation Link]

---

**版本信息：** 1.1.0
**最后更新：** 2026-04-15
