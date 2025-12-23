// src/app/admin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Stats {
  totalUsers: number;
  totalDownloads: number;
  totalErrors: number;
  todayDownloads: number;
  activeUsers24h: number;
  botDownloads: number;
  botUsers: number;
  buttonClicks: number;
  botToday: number;
  botDyysy: number;
  botVid7: number;
  botErrors: number;
  webDownloads: number;
  webToday: number;
  webDyysy: number;
  webVid7: number;
  uniqueIPs: number;
}

interface User {
  chat_id: number;
  username: string;
  success_count: number;
  created_at: string;
}

interface Download {
  id: string;
  chat_id?: number;
  sora_url: string;
  api_used: string;
  status?: string;
  created_at: string;
  result_url: string;
  title?: string;
  error?: string;
  ip_address?: string;
  source?: string;
}

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [topUsers, setTopUsers] = useState<User[]>([]);
  const [recentTasks, setRecentTasks] = useState<Download[]>([]);
  const [recentWebDownloads, setRecentWebDownloads] = useState<Download[]>([]);
  const [allDownloads, setAllDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(false);
  const [mainTab, setMainTab] = useState<'general' | 'telegram' | 'website'>('general');
  const [subTab, setSubTab] = useState<'overview' | 'users' | 'downloads'>('overview');
  const [darkMode, setDarkMode] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '427898';

  useEffect(() => {
    const savedTheme = localStorage.getItem('adminTheme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('adminTheme', newMode ? 'dark' : 'light');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      loadData();
    } else {
      alert('Неверный пароль!');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadTopUsers(),
        loadRecentTasks(),
        loadRecentWebDownloads(),
        loadAllDownloads()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    const { data: users } = await supabase.from('users').select('*');
    const { data: tasks } = await supabase.from('tasks').select('*');
    const { data: webDownloads } = await supabase.from('web_downloads').select('*');
    const { data: buttonClicks } = await supabase.from('button_clicks').select('*');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayTasks } = await supabase
      .from('tasks')
      .select('*')
      .gte('created_at', today.toISOString());

    const { data: todayWeb } = await supabase
      .from('web_downloads')
      .select('*')
      .gte('created_at', today.toISOString());

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { data: activeTasks } = await supabase
      .from('tasks')
      .select('chat_id')
      .gte('created_at', yesterday.toISOString());

    const uniqueActiveUsers = new Set(
      activeTasks?.filter(t => t.chat_id !== 0).map(t => t.chat_id) || []
    ).size;

    const botTasks = tasks?.filter(t => t.chat_id !== 0) || [];
    const botSuccess = botTasks.filter(t => t.status === 'success');
    const botDyysy = botSuccess.filter(t => t.api_used === 'dyysy').length;
    const botVid7 = botSuccess.filter(t => t.api_used === 'vid7').length;
    const botErrors = botTasks.filter(t => t.status === 'error').length;
    const botToday = todayTasks?.filter(t => t.chat_id !== 0 && t.status === 'success').length || 0;

    const webDyysy = webDownloads?.filter(w => w.api_used === 'dyysy').length || 0;
    const webVid7 = webDownloads?.filter(w => w.api_used === 'vid7').length || 0;
    const uniqueIPs = new Set(webDownloads?.map(w => w.ip_address).filter(ip => ip)).size;

    setStats({
      totalUsers: users?.length || 0,
      totalDownloads: botSuccess.length + (webDownloads?.length || 0),
      totalErrors: botErrors,
      todayDownloads: botToday + (todayWeb?.length || 0),
      activeUsers24h: uniqueActiveUsers,
      botDownloads: botSuccess.length,
      botUsers: users?.length || 0,
      buttonClicks: buttonClicks?.length || 0,
      botToday,
      botDyysy,
      botVid7,
      botErrors,
      webDownloads: webDownloads?.length || 0,
      webToday: todayWeb?.length || 0,
      webDyysy,
      webVid7,
      uniqueIPs
    });
  };

  const loadTopUsers = async () => {
    const response = await fetch('/api/admin/users');
    const data = await response.json();
    setTopUsers(data.users || []);
  };

  const loadRecentTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .neq('chat_id', 0)
      .order('created_at', { ascending: false })
      .limit(50);
    setRecentTasks(data || []);
  };

  const loadRecentWebDownloads = async () => {
    const { data } = await supabase
      .from('web_downloads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setRecentWebDownloads(data || []);
  };

  const loadAllDownloads = async () => {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: webDownloads } = await supabase
      .from('web_downloads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    const combined = [
      ...(tasks || []).map(t => ({ ...t, source: 'telegram' })),
      ...(webDownloads || []).map(w => ({ ...w, source: 'web', chat_id: 0 }))
    ];

    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setAllDownloads(combined.slice(0, 50));
  };

  const theme = {
    bg: darkMode ? 'bg-gray-900' : 'bg-gray-100',
    card: darkMode ? 'bg-gray-800' : 'bg-white',
    text: darkMode ? 'text-white' : 'text-gray-900',
    textSecondary: darkMode ? 'text-gray-400' : 'text-gray-600',
    border: darkMode ? 'border-gray-700' : 'border-gray-200',
    hover: darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50',
    tableHeader: darkMode ? 'bg-gray-700' : 'bg-gray-50'
  };

    // Продолжение AdminPanel component

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center`}>
        <div className={`${theme.card} p-8 rounded-lg shadow-lg w-96`}>
          <h1 className={`text-2xl font-bold mb-6 text-center ${theme.text}`}>🔐 Админ-панель</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Введите пароль"
              className={`w-full p-3 border rounded mb-4 ${theme.bg} ${theme.text} border-gray-600`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600">
              Войти
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold ${theme.text}`}>📊 SoraDownloadBot - Админ-панель</h1>
          <div className="flex gap-3">
            <button onClick={toggleTheme} className={`${theme.card} px-4 py-2 rounded shadow ${theme.text}`}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button onClick={loadData} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" disabled={loading}>
              {loading ? '⏳ Загрузка...' : '🔄 Обновить'}
            </button>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => { setMainTab('general'); setSubTab('overview'); }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mainTab === 'general' ? 'bg-blue-500 text-white shadow-lg' : `${theme.card} ${theme.text}`
            }`}>
            📊 Общее
          </button>
          <button
            onClick={() => { setMainTab('telegram'); setSubTab('overview'); }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mainTab === 'telegram' ? 'bg-blue-500 text-white shadow-lg' : `${theme.card} ${theme.text}`
            }`}>
            🤖 Telegram Бот
          </button>
          <button
            onClick={() => { setMainTab('website'); setSubTab('overview'); }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mainTab === 'website' ? 'bg-blue-500 text-white shadow-lg' : `${theme.card} ${theme.text}`
            }`}>
            🌐 Сайт
          </button>
        </div>

        {/* Sub Tabs */}
        <div className="flex space-x-2 mb-6">
          <button onClick={() => setSubTab('overview')} className={`px-4 py-2 rounded ${subTab === 'overview' ? 'bg-gray-600 text-white' : `${theme.card} ${theme.text}`}`}>
            Обзор
          </button>
          {mainTab === 'telegram' && (
            <button onClick={() => setSubTab('users')} className={`px-4 py-2 rounded ${subTab === 'users' ? 'bg-gray-600 text-white' : `${theme.card} ${theme.text}`}`}>
              Пользователи
            </button>
          )}
          <button onClick={() => setSubTab('downloads')} className={`px-4 py-2 rounded ${subTab === 'downloads' ? 'bg-gray-600 text-white' : `${theme.card} ${theme.text}`}`}>
            Скачивания
          </button>
        </div>

        {/* ОБЩЕЕ - ОБЗОР */}
        {mainTab === 'general' && subTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>👥 Всего пользователей</h3>
              <p className={`text-3xl font-bold ${theme.text}`}>{stats.totalUsers}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>✅ Всего скачиваний</h3>
              <p className="text-3xl font-bold text-green-600">{stats.totalDownloads}</p>
              <p className="text-sm text-gray-500 mt-1">Бот: {stats.botDownloads} | Веб: {stats.webDownloads}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>📅 Скачиваний сегодня</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.todayDownloads}</p>
              <p className="text-sm text-gray-500 mt-1">Бот: {stats.botToday} | Веб: {stats.webToday}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>🔥 Активных за 24ч</h3>
              <p className="text-3xl font-bold text-orange-600">{stats.activeUsers24h}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>❌ Ошибок</h3>
              <p className="text-3xl font-bold text-red-600">{stats.totalErrors}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>📊 Success Rate</h3>
              <p className="text-3xl font-bold text-green-600">
                {stats.totalDownloads + stats.totalErrors > 0 
                  ? Math.round((stats.totalDownloads / (stats.totalDownloads + stats.totalErrors)) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        )}

        {/* ОБЩЕЕ - СКАЧИВАНИЯ */}
        {mainTab === 'general' && subTab === 'downloads' && (
          <div className={`${theme.card} rounded-lg shadow overflow-hidden`}>
            <table className="min-w-full">
              <thead className={theme.tableHeader}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Источник</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Пользователь</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Sora URL</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>API</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Дата</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Детали</th>
                </tr>
              </thead>
              <tbody className={`${theme.card} divide-y ${theme.border}`}>
                {allDownloads.map((download) => (
                  <React.Fragment key={`${download.source}-${download.id}`}>
                    <tr className={theme.hover}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          download.source === 'telegram' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {download.source === 'telegram' ? '🤖 Telegram' : '🌐 Web'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.text}`}>
                        {download.source === 'telegram' 
                          ? `ID: ${download.chat_id}` 
                          : download.ip_address || 'unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <a 
                          href={download.sora_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {download.sora_url.substring(0, 40)}...
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          download.api_used === 'dyysy' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {download.api_used}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.textSecondary}`}>
                        {new Date(download.created_at).toLocaleString('ru-RU')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setExpandedTask(expandedTask === download.id ? null : download.id)}
                          className="text-blue-500 hover:underline"
                        >
                          {expandedTask === download.id ? '▼ Скрыть' : '▶ Показать'}
                        </button>
                      </td>
                    </tr>
                    {expandedTask === download.id && (
                      <tr>
                        <td colSpan={6} className={`px-6 py-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <div className={`space-y-2 text-sm ${theme.text}`}>
                            {download.title && (
                              <div>expandedTask === task.id &&
                                <span className="font-bold">Title:</span>
                                <pre className={`mt-1 p-2 rounded ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} overflow-x-auto text-xs whitespace-pre-wrap break-words`}>
                                  {download.title}
                                </pre>
                              </div>
                            )}
                            {download.result_url && (
                              <div>
                                <span className="font-bold">Download URL:</span>
                                <a 
                                  href={download.result_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline ml-2"
                                >
                                  Открыть
                                </a>
                              </div>
                            )}
                            {download.error && (
                              <div>
                                <span className="font-bold text-red-600">Error:</span>
                                <span className="ml-2">{download.error}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}

                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TELEGRAM - ОБЗОР */}
        {mainTab === 'telegram' && subTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>👥 Пользователей</h3>
              <p className={`text-3xl font-bold ${theme.text}`}>{stats.botUsers}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>✅ Скачиваний</h3>
              <p className="text-3xl font-bold text-green-600">{stats.botDownloads}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>📅 Сегодня</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.botToday}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>🔘 Кликов по кнопкам</h3>
              <p className="text-3xl font-bold text-purple-600">{stats.buttonClicks}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>🔵 DYYSY API</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.botDyysy}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>🟣 VID7 API</h3>
              <p className="text-3xl font-bold text-purple-600">{stats.botVid7}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>❌ Ошибок</h3>
              <p className="text-3xl font-bold text-red-600">{stats.botErrors}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>🔥 Активных за 24ч</h3>
              <p className="text-3xl font-bold text-orange-600">{stats.activeUsers24h}</p>
            </div>
          </div>
        )}

        {/* TELEGRAM - ПОЛЬЗОВАТЕЛИ */}
        {mainTab === 'telegram' && subTab === 'users' && (
          <div className={`${theme.card} rounded-lg shadow overflow-hidden`}>
            {topUsers.length === 0 ? (
              <div className="p-6 text-center">
                <p className={theme.textSecondary}>Нет пользователей</p>
              </div>
            ) : (
              <table className="min-w-full">
                <thead className={theme.tableHeader}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Chat ID</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Username</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Скачиваний</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Дата регистрации</th>
                  </tr>
                </thead>
                <tbody className={`${theme.card} divide-y ${theme.border}`}>
                  {topUsers.map((user) => (
                    <tr key={user.chat_id} className={theme.hover}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.text}`}>{user.chat_id}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.text}`}>
                        {user.username || <span className={theme.textSecondary}>Нет username</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                        {user.success_count}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.textSecondary}`}>
                        {new Date(user.created_at).toLocaleString('ru-RU')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

                {/* TELEGRAM - СКАЧИВАНИЯ */}
        {mainTab === 'telegram' && subTab === 'downloads' && (
          <div className={`${theme.card} rounded-lg shadow overflow-hidden`}>
            <table className="min-w-full">
              <thead className={theme.tableHeader}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Chat ID</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Sora URL</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>API</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Статус</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Дата</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Детали</th>
                </tr>
              </thead>
              <tbody className={`${theme.card} divide-y ${theme.border}`}>
                {recentTasks.map((task) => (
                  <React.Fragment key={task.id}>
                    <tr className={theme.hover}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.text}`}>{task.chat_id}</td>
                      <td className="px-6 py-4 text-sm">
                        <a 
                          href={task.sora_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {task.sora_url.substring(0, 40)}...
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          task.api_used === 'dyysy' ? 'bg-blue-100 text-blue-800' :
                          task.api_used === 'vid7' ? 'bg-purple-100 text-purple-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {task.api_used}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          task.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.textSecondary}`}>
                        {new Date(task.created_at).toLocaleString('ru-RU')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                          className="text-blue-500 hover:underline"
                        >
                          {expandedTask === task.id ? '▼ Скрыть' : '▶ Показать'}
                        </button>
                      </td>
                    </tr>
                    {expandedTask === task.id && (
                      <tr>
                        <td colSpan={6} className={`px-6 py-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <div className={`space-y-2 text-sm ${theme.text}`}>
                            {task.title && (
                              <div>
                                <span className="font-bold">Title:</span>
                                <pre className={`mt-1 p-2 rounded ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} overflow-x-auto text-xs whitespace-pre-wrap break-words`}>
                                  {task.title}
                                </pre>
                              </div>
                            )}
                            {task.result_url && (
                              <div>
                                <span className="font-bold">Download URL:</span>
                                <a 
                                  href={task.result_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline ml-2"
                                >
                                  Открыть
                                </a>
                              </div>
                            )}
                            {task.error && (
                              <div>
                                <span className="font-bold text-red-600">Error:</span>
                                <span className={`ml-2 ${theme.text}`}>{task.error}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* САЙТ - ОБЗОР */}
        {mainTab === 'website' && subTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>✅ Скачиваний</h3>
              <p className="text-3xl font-bold text-green-600">{stats.webDownloads}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>📅 Сегодня</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.webToday}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>🌐 Уникальных IP</h3>
              <p className={`text-3xl font-bold ${theme.text}`}>{stats.uniqueIPs}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>🔵 DYYSY API</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.webDyysy}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>🟣 VID7 API</h3>
              <p className="text-3xl font-bold text-purple-600">{stats.webVid7}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>📊 Доля от всех</h3>
              <p className="text-3xl font-bold text-purple-600">
                {stats.totalDownloads > 0 
                  ? Math.round((stats.webDownloads / stats.totalDownloads) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        )}

        {/* САЙТ - СКАЧИВАНИЯ */}
        {mainTab === 'website' && subTab === 'downloads' && (
          <div className={`${theme.card} rounded-lg shadow overflow-hidden`}>
            <table className="min-w-full">
              <thead className={theme.tableHeader}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Sora URL</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>API</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>IP</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Дата</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Детали</th>
                </tr>
              </thead>
              <tbody className={`${theme.card} divide-y ${theme.border}`}>
                {recentWebDownloads.map((download) => (
                  <React.Fragment key={download.id}>
                    <tr className={theme.hover}>
                      <td className="px-6 py-4 text-sm">
                        <a 
                          href={download.sora_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {download.sora_url.substring(0, 40)}...
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          download.api_used === 'dyysy' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {download.api_used}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${theme.textSecondary}`}>
                        {download.ip_address || 'unknown'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.textSecondary}`}>
                        {new Date(download.created_at).toLocaleString('ru-RU')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setExpandedTask(expandedTask === download.id ? null : download.id)}
                          className="text-blue-500 hover:underline"
                        >
                          {expandedTask === download.id ? '▼ Скрыть' : '▶ Показать'}
                        </button>
                      </td>
                    </tr>
                    {expandedTask === download.id && (
                      <tr>
                        <td colSpan={5} className={`px-6 py-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                          <div className={`space-y-2 text-sm ${theme.text}`}>
                            {download.title && (
                              <div>
                                <span className="font-bold">Title:</span>
                                <pre className={`mt-1 p-2 rounded ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'} overflow-x-auto text-xs whitespace-pre-wrap break-words`}>
                                  {download.title}
                                </pre>
                              </div>
                            )}
                            {download.result_url && (
                              <div>
                                <span className="font-bold">Download URL:</span>
                                <a 
                                  href={download.result_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline ml-2"
                                >
                                  Открыть
                                </a>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
