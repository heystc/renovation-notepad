import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Upload, ChevronDown, ChevronRight, X } from 'lucide-react';
import type { Settings, CategoryConfig, TagConfig, TagGroup, StatusConfig } from '../types';
import { DEFAULT_SETTINGS } from '../constants/defaultData';
import api from '../utils/api';
import * as Icons from 'lucide-react';

// 所有可用图标列表
const AVAILABLE_ICONS = [
  'home', 'sofa', 'utensils', 'bath', 'bed', 'book', 'user', 'flower',
  'shopping-bag', 'coffee', 'tv', 'wifi', 'key', 'door-open', 'lamp',
  'paintbrush', 'tool', 'hammer', 'wrench', 'settings', 'calendar',
  'map', 'image', 'file', 'folder', 'heart', 'star', 'check', 'alert',
  'clock', 'dollar-sign', 'credit-card', 'gift', 'camera', 'phone',
  'laptop', 'monitor', 'building', 'house', 'tree', 'cloud', 'sun',
  'moon', 'water', 'fire', 'wind', 'leaf', 'paw-print', 'utensils-crossed',
  'scissors', 'pen-tool', 'mouse', 'keyboard', 'hard-drive', 'server'
] as const;

export const SettingsPage = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.success) {
        setSettings(res.data.settings);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
      setSettings(DEFAULT_SETTINGS);
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);

    try {
      setSaving(true);
      const res = await api.post('/settings/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (res.data.success) {
        setSettings(prev => ({
          ...prev,
          logo: res.data.url,
        }));
        showToast('Logo上传成功');
      }
    } catch (error) {
      console.error('上传Logo失败:', error);
      showToast('上传失败');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLogo = () => {
    setSettings(prev => ({
      ...prev,
      logo: null,
    }));
  };

  // 分类操作
  const addCategory = () => {
    const newCategory: CategoryConfig = {
      id: `category-${Date.now()}`,
      label: '新分类',
      color: 'bg-gray-100 text-gray-700',
    };
    setSettings(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory],
    }));
  };

  const removeCategory = (index: number) => {
    setSettings(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index),
    }));
  };

  const updateCategory = (index: number, field: keyof CategoryConfig, value: string) => {
    setSettings(prev => {
      const newCategories = [...prev.categories];
      newCategories[index] = { ...newCategories[index], [field]: value };
      return { ...prev, categories: newCategories };
    });
  };

  // 分组状态：展开的分组ID集合
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconPickerTarget, setIconPickerTarget] = useState<
    { type: 'tag', groupId: string, tagIndex: number } |
    { type: 'group', groupId: string } | null
  >(null);

  // 默认展开所有分组，只添加新分组，不改变现有展开状态
  useEffect(() => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      settings.tagGroups.forEach(group => {
        // 只添加新分组，如果已经存在（不管是展开还是收起）保持用户当前状态
        if (!prev.has(group.id)) {
          next.add(group.id);
        }
      });
      return next;
    });
  }, [settings.tagGroups]);

  // 打开标签图标选择器
  const openIconPicker = (groupId: string, tagIndex: number) => {
    setIconPickerTarget({ type: 'tag', groupId, tagIndex });
    setIconPickerOpen(true);
  };

  // 打开分组图标选择器
  const openGroupIconPicker = (groupId: string) => {
    setIconPickerTarget({ type: 'group', groupId });
    setIconPickerOpen(true);
  };

  // 选择图标
  const selectIcon = (iconName: string) => {
    if (!iconPickerTarget) return;
    if (iconPickerTarget.type === 'tag') {
      updateTagInGroup(iconPickerTarget.groupId, iconPickerTarget.tagIndex, 'icon', iconName);
    } else if (iconPickerTarget.type === 'group') {
      updateGroup(iconPickerTarget.groupId, 'icon', iconName);
    }
    setIconPickerOpen(false);
    setIconPickerTarget(null);
  };

  // 分组操作
  const addGroup = () => {
    const newGroup: TagGroup = {
      id: `group-${Date.now()}`,
      name: '新分组',
      enableFilter: true,
      tags: [],
    };
    setSettings(prev => ({
      ...prev,
      tagGroups: [...prev.tagGroups, newGroup],
    }));
    // 自动展开新分组
    setExpandedGroups(prev => new Set(prev).add(newGroup.id));
  };

  const removeGroup = (groupId: string) => {
    setSettings(prev => ({
      ...prev,
      tagGroups: prev.tagGroups.filter(g => g.id !== groupId),
    }));
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.delete(groupId);
      return next;
    });
  };

  const updateGroup = (groupId: string, field: keyof TagGroup, value: any) => {
    setSettings(prev => {
      const newGroups = prev.tagGroups.map(g =>
        g.id === groupId ? { ...g, [field]: value } : g
      );
      return { ...prev, tagGroups: newGroups };
    });
  };

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // 分组内标签操作
  const addTagToGroup = (groupId: string) => {
    const newTag: TagConfig = {
      id: `tag-${Date.now()}`,
      label: '新标签',
      icon: 'home',
    };
    setSettings(prev => {
      const newGroups = prev.tagGroups.map(g => {
        if (g.id === groupId) {
          return { ...g, tags: [...g.tags, newTag] };
        }
        return g;
      });
      return { ...prev, tagGroups: newGroups };
    });
  };

  const removeTagFromGroup = (groupId: string, tagIndex: number) => {
    setSettings(prev => {
      const newGroups = prev.tagGroups.map(g => {
        if (g.id === groupId) {
          return { ...g, tags: g.tags.filter((_, i) => i !== tagIndex) };
        }
        return g;
      });
      return { ...prev, tagGroups: newGroups };
    });
  };

  const updateTagInGroup = (groupId: string, tagIndex: number, field: keyof TagConfig, value: string) => {
    setSettings(prev => {
      const newGroups = prev.tagGroups.map(g => {
        if (g.id === groupId) {
          const newTags = [...g.tags];
          newTags[tagIndex] = { ...newTags[tagIndex], [field]: value };
          return { ...g, tags: newTags };
        }
        return g;
      });
      return { ...prev, tagGroups: newGroups };
    });
  };

  // 状态操作
  const addStatus = () => {
    const newStatus: StatusConfig = {
      id: `status-${Date.now()}`,
      label: '新状态',
      color: 'bg-gray-100 text-gray-700',
      icon: 'circle',
    };
    setSettings(prev => ({
      ...prev,
      statuses: [...prev.statuses, newStatus],
    }));
  };

  const removeStatus = (index: number) => {
    setSettings(prev => ({
      ...prev,
      statuses: prev.statuses.filter((_, i) => i !== index),
    }));
  };

  const updateStatus = (index: number, field: keyof StatusConfig, value: string) => {
    setSettings(prev => {
      const newStatuses = [...prev.statuses];
      newStatuses[index] = { ...newStatuses[index], [field]: value };
      return { ...prev, statuses: newStatuses };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await api.put('/settings', {
        appName: settings.appName,
        logo: settings.logo,
        categories: settings.categories,
        tags: settings.tags,
        tagGroups: settings.tagGroups,
        statuses: settings.statuses,
      });
      if (res.data.success) {
        showToast('保存成功，刷新页面后生效');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      showToast('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold">应用设置</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-6">
          {/* 应用名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">应用名称</label>
            <input
              type="text"
              value={settings.appName || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, appName: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
              placeholder="输入应用名称"
            />
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
            {settings.logo ? (
              <div className="flex items-center gap-4">
                <img src={settings.logo} alt="Logo" className="h-12 w-auto rounded border" />
                <button
                  onClick={handleRemoveLogo}
                  className="px-3 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors text-sm"
                >
                  删除
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-gray-500">点击上传Logo（推荐尺寸：128x128）</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadLogo}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* 分类设置 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">分类列表</label>
              <button
                onClick={addCategory}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" /> 添加
              </button>
            </div>
            <div className="space-y-2">
              {settings.categories.map((category, index) => (
                <div key={category.id} className="flex items-center gap-2 p-2 border rounded">
                  <input
                    type="text"
                    value={category.id}
                    onChange={(e) => updateCategory(index, 'id', e.target.value)}
                    className="flex-1 px-2 py-1 border rounded text-sm"
                    placeholder="ID"
                  />
                  <input
                    type="text"
                    value={category.label}
                    onChange={(e) => updateCategory(index, 'label', e.target.value)}
                    className="flex-2 px-2 py-1 border rounded text-sm"
                    placeholder="名称"
                  />
                  <input
                    type="text"
                    value={category.color}
                    onChange={(e) => updateCategory(index, 'color', e.target.value)}
                    className="flex-3 px-2 py-1 border rounded text-sm"
                    placeholder="Tailwind 颜色类"
                  />
                  <button
                    onClick={() => removeCategory(index)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 标签分组设置 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">标签分组</label>
              <button
                onClick={addGroup}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" /> 添加分组
              </button>
            </div>
            <div className="space-y-4">
              {settings.tagGroups.map((group) => (
                <div key={group.id} className="border rounded-lg overflow-hidden">
                  {/* 分组头部 */}
                  <div
                    className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleGroupExpand(group.id)}
                  >
                    <div className="flex items-center gap-2">
                      {expandedGroups.has(group.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="text-sm font-medium text-gray-900">{group.name}</span>
                      <span className="text-xs text-gray-400">({group.tags.length} 个标签)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {group.enableFilter ? '筛选启用' : '筛选禁用'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeGroup(group.id);
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 分组内容 - 展开时显示 */}
                  {expandedGroups.has(group.id) && (
                    <div className="p-3 space-y-3">
                      {/* 分组基本信息 */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">分组名称</label>
                          <input
                            type="text"
                            value={group.name}
                            onChange={(e) => updateGroup(group.id, 'name', e.target.value)}
                            className="w-full px-2 py-1.5 border rounded text-sm"
                            placeholder="分组名称"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">分组图标</label>
                          <button
                            type="button"
                            onClick={() => openGroupIconPicker(group.id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 border rounded bg-gray-50 hover:bg-gray-100 transition-colors text-sm"
                          >
                            {group.icon ? renderIcon(group.icon) : null}
                            <span>{group.icon || '点击选择图标'}</span>
                          </button>
                        </div>
                        <div className="flex items-center">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={group.enableFilter}
                              onChange={(e) => updateGroup(group.id, 'enableFilter', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">在首页筛选栏显示</span>
                          </label>
                        </div>
                      </div>

                      {/* 添加标签按钮 */}
                      <div className="flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addTagToGroup(group.id);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs"
                        >
                          <Plus className="w-3 h-3" /> 添加标签
                        </button>
                      </div>

                      {/* 标签列表 */}
                      <div className="space-y-2">
                        {group.tags.map((tag, tagIndex) => (
                          <div key={tag.id} className="flex items-center gap-2 p-2 border rounded bg-white">
                            <input
                              type="text"
                              value={tag.id}
                              onChange={(e) => updateTagInGroup(group.id, tagIndex, 'id', e.target.value)}
                              className="flex-1 px-2 py-1 border rounded text-sm"
                              placeholder="ID"
                            />
                            <input
                              type="text"
                              value={tag.label}
                              onChange={(e) => updateTagInGroup(group.id, tagIndex, 'label', e.target.value)}
                              className="flex-2 px-2 py-1 border rounded text-sm"
                              placeholder="名称"
                            />
                            <button
                              type="button"
                              onClick={() => openIconPicker(group.id, tagIndex)}
                              className="flex items-center gap-2 px-3 py-1 border rounded bg-gray-50 hover:bg-gray-100 transition-colors"
                              title="选择图标"
                            >
                              {renderIcon(tag.icon)}
                              <span className="text-sm text-gray-600">{tag.icon}</span>
                            </button>
                            <button
                              onClick={() => removeTagFromGroup(group.id, tagIndex)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* 图标选择弹窗 */}
                      {iconPickerOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[70vh] flex flex-col">
                            <div className="p-4 border-b flex justify-between items-center">
                              <h3 className="font-semibold text-lg">选择图标</h3>
                              <button
                                onClick={() => {
                                  setIconPickerOpen(false);
                                  setIconPickerTarget(null);
                                }}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                            <div className="p-4 overflow-y-auto">
                              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                                {AVAILABLE_ICONS.map(iconName => {
                                  const IconComp = getIconComponent(iconName);
                                  return (
                                    <button
                                      key={iconName}
                                      onClick={() => selectIcon(iconName)}
                                      className="flex flex-col items-center justify-center p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                      title={iconName}
                                    >
                                      {IconComp && <IconComp className="w-5 h-5 text-gray-600" />}
                                      <span className="text-xs text-gray-500 mt-1 truncate w-full text-center">{iconName}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 状态设置 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">状态列表</label>
              <button
                onClick={addStatus}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" /> 添加
              </button>
            </div>
            <div className="space-y-2">
              {settings.statuses.map((status, index) => (
                <div key={status.id} className="flex items-center gap-2 p-2 border rounded">
                  <input
                    type="text"
                    value={status.id}
                    onChange={(e) => updateStatus(index, 'id', e.target.value)}
                    className="flex-1 px-2 py-1 border rounded text-sm"
                    placeholder="ID"
                  />
                  <input
                    type="text"
                    value={status.label}
                    onChange={(e) => updateStatus(index, 'label', e.target.value)}
                    className="flex-2 px-2 py-1 border rounded text-sm"
                    placeholder="名称"
                  />
                  <input
                    type="text"
                    value={status.color}
                    onChange={(e) => updateStatus(index, 'color', e.target.value)}
                    className="flex-3 px-2 py-1 border rounded text-sm"
                    placeholder="Tailwind 颜色类"
                  />
                  <button
                    onClick={() => removeStatus(index)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? '保存中...' : '保存设置'}
            </button>
          </div>
        </div>
      </main>

      {/* Toast消息提醒 */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl animate-fade-in-out">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

// 动态渲染图标
function renderIcon(iconName: string): React.ReactNode {
  const IconComp = getIconComponent(iconName);
  if (IconComp) {
    return <IconComp className="w-4 h-4 text-gray-600" />;
  }
  return null;
}

// 获取图标组件
function getIconComponent(iconName: string): React.FC<{ className?: string }> | null {
  // 将 kebab-case 转为 PascalCase
  const pascalName = iconName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  return (Icons as any)[pascalName] || null;
}

export default SettingsPage;
