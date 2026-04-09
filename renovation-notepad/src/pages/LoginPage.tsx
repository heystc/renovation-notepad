import React, { useState } from 'react';
import heroImage from '../assets/hero.png';
import api from '../utils/api';

interface LoginPageProps {
  onLogin: (username: string, isAdmin: boolean) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsLoggingIn(true);
    setError('');

    try {
      const res = await api.post('/login', { username, password });
      if (res.data.success) {
        localStorage.setItem('auth_token', res.data.token);
        onLogin(username, res.data.isAdmin);
      } else {
        setError(res.data.message || '登录失败');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '网络错误，请重试');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">装修记事本</h1>
            <p className="text-gray-500">记录你的装修灵感，掌控每一分预算</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 pt-6 pb-0">
              <img
                src={heroImage}
                alt="装修"
                className="w-full h-48 object-cover rounded-xl mb-6"
              />
            </div>
            <form onSubmit={handleSubmit} className="px-6 pb-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="请输入用户名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="请输入密码"
                  />
                </div>
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isLoggingIn ? '登录中...' : '登录'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
