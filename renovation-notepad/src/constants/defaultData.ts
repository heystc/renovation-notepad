import type { Settings, Note, ExpenseItem } from '../types';

export const DEFAULT_SETTINGS: Settings = {
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

export const MOCK_NOTES: Note[] = [
  {
    id: '1',
    category: 'idea',
    title: '北欧风格电视背景墙设计',
    content: '# 电视背景墙设计\n\n参考了宜家的贝达系列，准备用浅灰色护墙板搭配木质隔板。\n\n## 注意事项\n\n- 插座要预留在电视下方30cm处\n- 预留网线和HDMI线\n- 考虑安装氛围灯',
    isPinned: true,
    date: '2026-04-01',
    room: 'living',
    progress: 'in-progress',
    budget: 5000,
    actualCost: 4800
  },
  {
    id: '2',
    category: 'product',
    title: '马可波罗瓷砖 - 客厅地砖',
    content: '# 马可波罗瓷砖\n\n**型号：** CZ8998AS  \n**尺寸：** 800x800mm  \n**价格：** 128元/块\n\n[购买链接](https://example.com/tiles/marcopolo)',
    date: '2026-03-28',
    room: 'living',
    progress: 'done',
    budget: 8000,
    actualCost: 8200
  }
];

export const MOCK_EXPENSES: ExpenseItem[] = [
  { id: '1', name: '客厅地砖', category: '建材', room: 'living', budgeted: 8000, actual: 8200, status: 'paid', date: '2026-03-28' },
  { id: '2', name: '电视背景墙', category: '施工', room: 'living', budgeted: 5000, actual: 4800, status: 'paid', date: '2026-04-01' },
];
