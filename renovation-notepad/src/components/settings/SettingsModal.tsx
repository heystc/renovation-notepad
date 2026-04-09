import React, { useState, useEffect, useRef } from 'react';
import { X, Settings as SettingsIcon, Trash2, Save, Plus, Home, Sofa, Utensils, Bath, Bed, BookOpen, User as UserIcon, Flower2 } from 'lucide-react';
import type { Settings, User } from '../../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getRoomIcon, getStatusIcon } from '../../utils/icons';
import api from '../../utils/api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (settings: Settings) => Promise<void>;
  currentUser: string;
  isCurrentUserAdmin: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdate,
  currentUser,
  isCurrentUserAdmin,
}) => {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [activeTab, setActiveTab] = useState<'categories' | 'rooms' | 'statuses' | 'users'>('categories');
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen, activeTab]);

  const loadUsers = async () => {
    if (!isCurrentUserAdmin) return;
    try {
      const res = await api.get('/users');
      if (res.data.success) {
        setUsers(res.data.users);
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
    }
  };

  const handleAddUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      alert('用户名和密码不能为空');
      return;
    }
    try {
      const res = await api.post('/users', {
        username: newUsername.trim(),
        password: newPassword.trim(),
        isAdmin: newIsAdmin
      });
      if (res.data.success) {
        setUsers(res.data.users);
        setShowAddUser(false);
        setNewUsername('');
        setNewPassword('');
        setNewIsAdmin(false);
      } else {
        alert(res.data.message || '创建用户失败');
      }
    } catch (error: any) {
      console.error('创建用户失败:', error);
      alert(error.response?.data?.message || '创建用户失败');
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (username === currentUser) {
      alert('不能删除自己');
      return;
    }
    if (!window.confirm(`确定要删除用户 "${username}" 吗？`)) return;
    try {
      const res = await api.delete(`/users/${username}`);
      if (res.data.success) {
        setUsers(res.data.users);
      } else {
        alert(res.data.message || '删除用户失败');
      }
    } catch (error: any) {
      console.error('删除用户失败:', error);
      alert(error.response?.data?.message || '删除用户失败');
    }
  };

  const handleToggleAdmin = async (username: string, currentIsAdmin: boolean) => {
    try {
      const res = await api.put(`/users/${username}`, {
        isAdmin: !currentIsAdmin
      });
      if (res.data.success) {
        setUsers(res.data.users);
      } else {
        alert(res.data.message || '修改用户失败');
      }
    } catch (error: any) {
      console.error('修改用户失败:', error);
      alert(error.response?.data?.message || '修改用户失败');
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword.trim()) {
      alert('请输入原密码');
      return;
    }
    if (!newUserPassword.trim()) {
      alert('请输入新密码');
      return;
    }
    if (newUserPassword !== confirmPassword) {
      alert('两次输入的新密码不一致');
      return;
    }
    try {
      const res = await api.post('/change-password', {
        oldPassword,
        newPassword: newUserPassword
      });
      if (res.data.success) {
        alert('密码修改成功，请重新登录');
        localStorage.removeItem('auth_token');
        window.location.reload();
      } else {
        alert(res.data.message || '修改密码失败');
      }
    } catch (error: any) {
      console.error('修改密码失败:', error);
      alert(error.response?.data?.message || '修改密码失败');
    }
  };

  useEffect(() => {
    setLocalSettings(settings);
    if (isOpen && activeTab === 'users' && isCurrentUserAdmin) {
      loadUsers();
    }
  }, [settings, isOpen, activeTab, isCurrentUserAdmin]);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(localSettings);
      onClose();
    } catch (error) {
      console.error('保存设置失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = (type: 'categories' | 'rooms' | 'statuses') => {
    const id = Date.now().toString(36);
    setLocalSettings(prev => {
      const newSettings = { ...prev };
      if (type === 'categories') {
        newSettings.categories = [...prev.categories, { id, label: '新分类', color: 'bg-gray-100 text-gray-700' }];
      } else if (type === 'rooms') {
        newSettings.rooms = [...prev.rooms, { id, label: '新房间', icon: 'home' }];
      } else if (type === 'statuses') {
        newSettings.statuses = [...prev.statuses, { id, label: '新状态', color: 'bg-gray-100 text-gray-700', icon: 'alert' }];
      }
      return newSettings;
    });
  };

  const removeItem = (type: 'categories' | 'rooms' | 'statuses', id: string) => {
    setLocalSettings(prev => {
      const newSettings = { ...prev };
      if (type === 'categories') {
        newSettings.categories = prev.categories.filter(c => c.id !== id);
      } else if (type === 'rooms') {
        newSettings.rooms = prev.rooms.filter(r => r.id !== id);
      } else if (type === 'statuses') {
        newSettings.statuses = prev.statuses.filter(s => s.id !== id);
      }
      return newSettings;
    });
  };

  const updateItem = (type: 'categories' | 'rooms' | 'statuses', id: string, updates: any) => {
    setLocalSettings(prev => {
      const newSettings = { ...prev };
      if (type === 'categories') {
        newSettings.categories = prev.categories.map(c => c.id === id ? { ...c, ...updates } : c);
      } else if (type === 'rooms') {
        newSettings.rooms = prev.rooms.map(r => r.id === id ? { ...r, ...updates } : r);
      } else if (type === 'statuses') {
        newSettings.statuses = prev.statuses.map(s => s.id === id ? { ...s, ...updates } : s);
      }
      return newSettings;
    });
  };

  const colorOptions = [
    { bg: 'bg-amber-100', text: 'text-amber-700', label: '琥珀' },
    { bg: 'bg-blue-100', text: 'text-blue-700', label: '蓝色' },
    { bg: 'bg-green-100', text: 'text-green-700', label: '绿色' },
    { bg: 'bg-purple-100', text: 'text-purple-700', label: '紫色' },
    { bg: 'bg-pink-100', text: 'text-pink-700', label: '粉色' },
    { bg: 'bg-red-100', text: 'text-red-700', label: '红色' },
    { bg: 'bg-gray-100', text: 'text-gray-700', label: '灰色' },
  ];

  const iconOptions = [
    { id: 'home', icon: <Home className="w-4 h-4" /> },
    { id: 'sofa', icon: <Sofa className="w-4 h-4" /> },
    { id: 'utensils', icon: <Utensils className="w-4 h-4" /> },
    { id: 'bath', icon: <Bath className="w-4 h-4" /> },
    { id: 'bed', icon: <Bed className="w-4 h-4" /> },
    { id: 'book', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'user', icon: <UserIcon className="w-4 h-4" /> },
    { id: 'flower', icon: <Flower2 className="w-4 h-4" /> },
  ];

  if (!isOpen) return null;

  return (
    <div ref={modalRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onMouseDown={e => e.stopPropagation()}>
        <div className="p-4 border-b flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-lg">系统设置</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex border-b bg-gray-50 flex-wrap">
          <button
            onClick={() => setActiveTab('categories')}
            className={cn(
              "flex-1 min-w-[80px] px-4 py-3 text-sm font-medium transition-colors",
              activeTab === 'categories'
                ? "bg-white text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            分类管理
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={cn(
              "flex-1 min-w-[80px] px-4 py-3 text-sm font-medium transition-colors",
              activeTab === 'rooms'
                ? "bg-white text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            房间管理
          </button>
          <button
            onClick={() => setActiveTab('statuses')}
            className={cn(
              "flex-1 min-w-[80px] px-4 py-3 text-sm font-medium transition-colors",
              activeTab === 'statuses'
                ? "bg-white text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            状态管理
          </button>
          <button
            onClick={() => {
              setActiveTab('users');
              if (isCurrentUserAdmin) {
                loadUsers();
              }
            }}
            className={cn(
              "flex-1 min-w-[80px] px-4 py-3 text-sm font-medium transition-colors",
              activeTab === 'users'
                ? "bg-white text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            用户管理
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'categories' && (
            <div className="space-y-3">
              {localSettings.categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className={cn("px-3 py-1 rounded-full text-sm font-medium", cat.color)}>
                    {cat.label}
                  </span>
                  <input
                    type="text"
                    value={cat.label}
                    onChange={(e) => updateItem('categories', cat.id, { label: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <div className="flex gap-1">
                    {colorOptions.map((color) => (
                      <button
                        key={`${cat.id}-${color.bg}`}
                        onClick={() => updateItem('categories', cat.id, { color: `${color.bg} ${color.text}` })}
                        className={cn(
                          "w-6 h-6 rounded-full border-2",
                          `${color.bg}`,
                          cat.color === `${color.bg} ${color.text}` ? "border-blue-500" : "border-transparent"
                        )}
                        title={color.label}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => removeItem('categories', cat.id)}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addItem('categories')}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                + 添加分类
              </button>
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="space-y-3">
              {localSettings.rooms.map((room) => (
                <div key={room.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-gray-200 rounded-lg">
                    {getRoomIcon(room.icon)}
                  </div>
                  <input
                    type="text"
                    value={room.label}
                    onChange={(e) => updateItem('rooms', room.id, { label: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <div className="flex gap-1">
                    {iconOptions.map((icon) => (
                      <button
                        key={`${room.id}-${icon.id}`}
                        onClick={() => updateItem('rooms', room.id, { icon: icon.id })}
                        className={cn(
                          "p-2 rounded-lg border-2 transition-colors",
                          room.icon === icon.id ? "border-blue-500 bg-blue-50" : "border-transparent hover:bg-gray-100"
                        )}
                      >
                        {icon.icon}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => removeItem('rooms', room.id)}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addItem('rooms')}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                + 添加房间
              </button>
            </div>
          )}

          {activeTab === 'statuses' && (
            <div className="space-y-3">
              {localSettings.statuses.map((status) => (
                <div key={status.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className={cn("flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium", status.color)}>
                    {getStatusIcon(status.icon)}
                    {status.label}
                  </span>
                  <input
                    type="text"
                    value={status.label}
                    onChange={(e) => updateItem('statuses', status.id, { label: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <div className="flex gap-1">
                    {colorOptions.map((color) => (
                      <button
                        key={`${status.id}-${color.bg}`}
                        onClick={() => updateItem('statuses', status.id, { color: `${color.bg} ${color.text}` })}
                        className={cn(
                          "w-6 h-6 rounded-full border-2",
                          `${color.bg}`,
                          status.color === `${color.bg} ${color.text}` ? "border-blue-500" : "border-transparent"
                        )}
                        title={color.label}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => removeItem('statuses', status.id)}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => addItem('statuses')}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                + 添加状态
              </button>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* 修改密码 - 所有用户都可以修改自己的密码 */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">修改当前密码 ({currentUser})</h3>
                <div className="space-y-3">
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="原密码"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
                    name="oldPassword"
                  />
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="新密码"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
                    name="newPassword"
                  />
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="确认新密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
                    name="confirmPassword"
                  />
                  <button
                    onClick={handleChangePassword}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    修改密码
                  </button>
                </div>
              </div>

              {/* 用户列表 - 仅管理员可见 */}
              {isCurrentUserAdmin && (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">用户列表</h3>
                    <button
                      onClick={() => setShowAddUser(!showAddUser)}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      添加用户
                    </button>
                  </div>

                  {showAddUser && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                      <h4 className="font-medium text-gray-900">新建用户</h4>
                      <input
                        type="text"
                        placeholder="用户名"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        name="newUsername"
                        autoComplete="off"
                      />
                      <input
                        type="password"
                        placeholder="密码"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        name="newUserPassword"
                        autoComplete="new-password"
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={newIsAdmin}
                          onChange={(e) => setNewIsAdmin(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        管理员权限
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddUser}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          创建
                        </button>
                        <button
                          onClick={() => setShowAddUser(false)}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {users.map((user) => (
                      <div key={user.username} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                        <UserIcon className="w-5 h-5 text-gray-500" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {user.username}
                            {user.isAdmin && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">管理员</span>}
                          </div>
                        </div>
                        {user.username !== 'admin' && (
                          <>
                            <button
                              onClick={() => handleToggleAdmin(user.username, user.isAdmin)}
                              className={cn(
                                "px-2 py-1 rounded text-xs transition-colors",
                                user.isAdmin
                                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                              )}
                            >
                              {user.isAdmin ? '取消管理员' : '设为管理员'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.username)}
                              className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                              title="删除用户"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                    {users.length === 0 && (
                      <p className="text-center text-gray-500 py-4">暂无用户</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
