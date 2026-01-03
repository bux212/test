// src/app/admin/page.tsx
'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']

interface Stats {
  totalUsers: number
  totalDownloads: number
  totalErrors: number
  todayDownloads: number
  activeUsers24h: number
  botDownloads: number
  botUsers: number
  buttonClicks: number
  botToday: number
  botDyysy: number
  botVid7: number
  botErrors: number
  webDownloads: number
  webToday: number
  webDyysy: number
  webVid7: number
  uniqueIPs: number
}

interface Broadcast {
  id: string
  message_text: string
  sent_count: number
  failed_count: number
  status: string
  created_at: string
  completed_at?: string
}

interface User {
  chat_id: number
  username?: string
  first_name?: string
  success_count: number
  created_at: string
  language?: string
  show_video_text?: boolean
}


interface Download {
  id: string
  chat_id?: number
  sora_url: string
  api_used: string
  status?: string
  created_at: string
  result_url?: string
  title?: string
  error?: string
  ip_address?: string
  source?: string
  username?: string // ✅ Добавлено для JOIN
}

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [stats, setStats] = useState<Stats | null>(null)
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [dailyStats, setDailyStats] = useState<any[]>([])
  const [topUsers, setTopUsers] = useState<any[]>([])
  const [recentTasks, setRecentTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [mainTab, setMainTab] = useState<'general' | 'telegram' | 'website' | 'broadcasts'>('general')
  const [subTab, setSubTab] = useState<'overview' | 'users' | 'downloads'>('overview')
  const [darkMode, setDarkMode] = useState(false)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [recentWebDownloads, setRecentWebDownloads] = useState<any[]>([])
  const [allDownloads, setAllDownloads] = useState<any[]>([])
  
  // ✅ НОВЫЕ СОСТОЯНИЯ ДЛЯ ПАГИНАЦИИ И ФИЛЬТРОВ
  const [usersPage, setUsersPage] = useState(1)
  const [downloadsPage, setDownloadsPage] = useState(1)
  const [last24hOnly, setLast24hOnly] = useState(false)
  const ITEMS_PER_PAGE = 50

  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '427898'

  useEffect(() => {
    const savedTheme = localStorage.getItem('adminTheme')
    if (savedTheme === 'dark') setDarkMode(true)
  }, [])

  const toggleTheme = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    localStorage.setItem('adminTheme', newMode ? 'dark' : 'light')
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      loadData()
    } else {
      alert('Неверный пароль!')
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadStats(),
        loadTopUsers(),
        loadRecentTasks(),
        loadRecentWebDownloads(),
        loadAllDownloads(),
        loadBroadcasts(),
        loadDailyStats()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
    }
    setLoading(false)
  }

  const loadStats = async () => {
    const { data: users } = await supabase.from('users').select('*')
    const { data: tasks } = await supabase.from('tasks').select('*')
    const { data: webDownloads } = await supabase.from('web_downloads').select('*')
    const { data: buttonClicks } = await supabase.from('button_clicks').select('*')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: todayTasks } = await supabase
      .from('tasks')
      .select('*')
      .gte('created_at', today.toISOString())

    const { data: todayWeb } = await supabase
      .from('web_downloads')
      .select('*')
      .gte('created_at', today.toISOString())

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const { data: activeTasks } = await supabase
      .from('tasks')
      .select('chat_id')
      .gte('created_at', yesterday.toISOString())

    const uniqueActiveUsers = new Set(activeTasks?.filter(t => t.chat_id !== 0).map(t => t.chat_id)).size

    const botTasks = tasks?.filter(t => t.chat_id !== 0)
    const botSuccess = botTasks?.filter(t => t.status === 'success')
    const botDyysy = botSuccess?.filter(t => t.api_used === 'dyysy').length || 0
    const botVid7 = botSuccess?.filter(t => t.api_used === 'vid7').length || 0
    const botErrors = botTasks?.filter(t => t.status === 'error').length || 0
    const botToday = todayTasks?.filter(t => t.chat_id !== 0 && t.status === 'success').length || 0

    const webDyysy = webDownloads?.filter(w => w.api_used === 'dyysy').length || 0
    const webVid7 = webDownloads?.filter(w => w.api_used === 'vid7').length || 0

    const uniqueIPs = new Set(webDownloads?.map(w => w.ip_address).filter(ip => ip)).size

    setStats({
      totalUsers: users?.length || 0,
      totalDownloads: (botSuccess?.length || 0) + (webDownloads?.length || 0),
      totalErrors: botErrors,
      todayDownloads: botToday + (todayWeb?.length || 0),
      activeUsers24h: uniqueActiveUsers,
      botDownloads: botSuccess?.length || 0,
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
    })
  }

  const loadBroadcasts = async () => {
    const { data } = await supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false })
    setBroadcasts(data || [])
  }

  const loadDailyStats = async () => {
    const { data: tasks } = await supabase.from('tasks').select('created_at, status')
    const { data: users } = await supabase.from('users').select('created_at')
    
    const now = new Date()
    const stats = []
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString()
      
      const newUsers = users?.filter(u => {
        const created = new Date(u.created_at)
        return created >= date && created < new Date(nextDate)
      }).length || 0
      
      const downloads = tasks?.filter(t => {
        const created = new Date(t.created_at)
        return t.status === 'success' && created >= date && created < new Date(nextDate)
      }).length || 0
      
      stats.push({ date: dateStr, users: newUsers, downloads })
    }
    
    setDailyStats(stats)
  }

  // ✅ ОБНОВЛЁННАЯ ФУНКЦИЯ loadTopUsers
  const loadTopUsers = async () => {
    const { data: users, error } = await supabase
      .from('users')
      .select('chat_id, username, first_name, success_count, created_at, language, show_video_text')
      .order('success_count', { ascending: false })   
    setTopUsers(users || [])
  }

  // ✅ ОБНОВЛЁННАЯ ФУНКЦИЯ loadRecentTasks с JOIN
  const loadRecentTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select(`
        *,
        users!tasks_chat_id_fkey (username)
      `)
      .neq('chat_id', 0)
      .order('created_at', { ascending: false })
      .limit(500)
    
    const tasksWithUsername = data?.map(task => ({
      ...task,
      username: task.users?.username || null
    })) || []
    
    setRecentTasks(tasksWithUsername)
  }

  const loadRecentWebDownloads = async () => {
    const { data } = await supabase
      .from('web_downloads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    
    setRecentWebDownloads(data || [])
  }

  const loadAllDownloads = async () => {
    const { data: tasks } = await supabase
      .from('tasks')
      .select(`
        *,
        users!tasks_chat_id_fkey (username)
      `)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(500)

    const { data: webDownloads } = await supabase
      .from('web_downloads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    const combined = [
      ...(tasks?.map(t => ({ ...t, source: 'telegram', username: t.users?.username })) || []),
      ...(webDownloads?.map(w => ({ ...w, source: 'web', chat_id: 0 })) || [])
    ]

    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setAllDownloads(combined)
  }

  // ✅ ФУНКЦИИ ФИЛЬТРАЦИИ И ПАГИНАЦИИ
  const filterLast24h = <T extends { created_at: string }>(items: T[]): T[] => {
    if (!last24hOnly) return items
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return items.filter(item => new Date(item.created_at) >= yesterday)
  }

  const paginate = <T,>(items: T[], page: number): T[] => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return items.slice(start, start + ITEMS_PER_PAGE)
  }

  const getTotalPages = (totalItems: number) => Math.ceil(totalItems / ITEMS_PER_PAGE)
/////
  
  const theme = {
    bg: darkMode ? 'bg-gray-900' : 'bg-gray-100',
    card: darkMode ? 'bg-gray-800' : 'bg-white',
    text: darkMode ? 'text-white' : 'text-gray-900',
    textSecondary: darkMode ? 'text-gray-400' : 'text-gray-600',
    border: darkMode ? 'border-gray-700' : 'border-gray-200',
    hover: darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50',
    tableHeader: darkMode ? 'bg-gray-700' : 'bg-gray-50'
  }

  // ✅ КОМПОНЕНТ ПАГИНАЦИИ
  const Pagination = ({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (page: number) => void }) => {
    if (totalPages <= 1) return null
    
    return (
      <div className="flex justify-center items-center gap-2 mt-4">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
        >
          ← Назад
        </button>
        <span className={theme.text}>
          Страница {currentPage} из {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded ${currentPage === totalPages ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
        >
          Вперёд →
        </button>
      </div>
    )
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen ${theme.bg} flex items-center justify-center p-4`}>
        <div className={`${theme.card} p-8 rounded-lg shadow-lg w-full max-w-md`}>
          <h1 className={`text-2xl font-bold mb-6 text-center ${theme.text}`}>Админ-панель</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Введите пароль"
              className={`w-full p-3 border rounded mb-4 ${theme.bg} ${theme.text} ${theme.border}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-3 rounded hover:bg-blue-600"
            >
              Войти
            </button>
          </form>
        </div>
      </div>
    )
  }

  const languageData = stats ? [
    { name: 'Русский', value: Math.round(stats.totalUsers * 0.7) },
    { name: 'English', value: Math.round(stats.totalUsers * 0.25) },
    { name: 'Другие', value: Math.round(stats.totalUsers * 0.05) }
  ] : []

  const apiData = stats ? [
    { name: 'DYYSY', value: stats.botDyysy + stats.webDyysy },
    { name: 'VID7', value: stats.botVid7 + stats.webVid7 }
  ] : []


    return (
    <div className={`min-h-screen ${theme.bg}`}>
      {/* Header */}
      <div className={`${theme.card} shadow-lg`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className={`text-2xl font-bold ${theme.text}`}>SoraDownloadBot - Админка</h1>
            <div className="flex gap-3">
              <button
                onClick={toggleTheme}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <button
                onClick={loadData}
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {loading ? '⏳ Загрузка...' : '🔄 Обновить'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => { setMainTab('general'); setSubTab('overview') }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mainTab === 'general' ? 'bg-blue-500 text-white shadow-lg' : `${theme.card} ${theme.text}`
            }`}
          >
            📊 Общее
          </button>
          <button
            onClick={() => { setMainTab('telegram'); setSubTab('overview') }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mainTab === 'telegram' ? 'bg-blue-500 text-white shadow-lg' : `${theme.card} ${theme.text}`
            }`}
          >
            🤖 Telegram
          </button>
          <button
            onClick={() => { setMainTab('website'); setSubTab('overview') }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mainTab === 'website' ? 'bg-blue-500 text-white shadow-lg' : `${theme.card} ${theme.text}`
            }`}
          >
            🌐 Сайт
          </button>
          <button
            onClick={() => { setMainTab('broadcasts'); setSubTab('overview') }}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              mainTab === 'broadcasts' ? 'bg-blue-500 text-white shadow-lg' : `${theme.card} ${theme.text}`
            }`}
          >
            📢 Рассылки
          </button>
        </div>

        {/* Sub Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setSubTab('overview')}
            className={`px-4 py-2 rounded ${
              subTab === 'overview' ? 'bg-gray-600 text-white' : `${theme.card} ${theme.text}`
            }`}
          >
            Обзор
          </button>
          {mainTab === 'telegram' && (
            <>
              <button
                onClick={() => setSubTab('users')}
                className={`px-4 py-2 rounded ${
                  subTab === 'users' ? 'bg-gray-600 text-white' : `${theme.card} ${theme.text}`
                }`}
              >
                Пользователи
              </button>
              <button
                onClick={() => setSubTab('downloads')}
                className={`px-4 py-2 rounded ${
                  subTab === 'downloads' ? 'bg-gray-600 text-white' : `${theme.card} ${theme.text}`
                }`}
              >
                Скачивания
              </button>
            </>
          )}
        </div>


                {/* GENERAL OVERVIEW */}
        {mainTab === 'general' && subTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`${theme.card} p-6 rounded-lg shadow`}>
                <div className={`text-sm ${theme.textSecondary}`}>Всего пользователей</div>
                <div className="text-3xl font-bold text-blue-600">{stats.totalUsers}</div>
              </div>
              <div className={`${theme.card} p-6 rounded-lg shadow`}>
                <div className={`text-sm ${theme.textSecondary}`}>Всего скачиваний</div>
                <div className="text-3xl font-bold text-green-600">{stats.totalDownloads}</div>
              </div>
              <div className={`${theme.card} p-6 rounded-lg shadow`}>
                <div className={`text-sm ${theme.textSecondary}`}>Сегодня</div>
                <div className="text-3xl font-bold text-purple-600">{stats.todayDownloads}</div>
              </div>
              <div className={`${theme.card} p-6 rounded-lg shadow`}>
                <div className={`text-sm ${theme.textSecondary}`}>Ошибок</div>
                <div className="text-3xl font-bold text-red-600">{stats.totalErrors}</div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Activity Chart */}
              <div className={`${theme.card} p-6 rounded-lg shadow`}>
                <h3 className={`text-lg font-semibold mb-4 ${theme.text}`}>📈 Активность за 30 дней</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#E5E7EB'} />
                    <XAxis dataKey="date" stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <YAxis stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1F2937' : '#FFF', border: 'none' }} />
                    <Legend />
                    <Line type="monotone" dataKey="users" stroke="#3B82F6" name="Новые пользователи" />
                    <Line type="monotone" dataKey="downloads" stroke="#10B981" name="Скачивания" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Language Distribution */}
              <div className={`${theme.card} p-6 rounded-lg shadow`}>
                <h3 className={`text-lg font-semibold mb-4 ${theme.text}`}>🌍 Распределение языков</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={languageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {languageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* API Usage */}
              <div className={`${theme.card} p-6 rounded-lg shadow`}>
                <h3 className={`text-lg font-semibold mb-4 ${theme.text}`}>🔧 Использование API</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={apiData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#E5E7EB'} />
                    <XAxis dataKey="name" stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <YAxis stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1F2937' : '#FFF', border: 'none' }} />
                    <Bar dataKey="value" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Daily Downloads */}
              <div className={`${theme.card} p-6 rounded-lg shadow`}>
                <h3 className={`text-lg font-semibold mb-4 ${theme.text}`}>📊 Скачивания за неделю</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyStats.slice(-7)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#E5E7EB'} />
                    <XAxis dataKey="date" stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <YAxis stroke={darkMode ? '#9CA3AF' : '#6B7280'} />
                    <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1F2937' : '#FFF', border: 'none' }} />
                    <Bar dataKey="downloads" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* BROADCASTS */}
        {mainTab === 'broadcasts' && (
          <div className={`${theme.card} p-6 rounded-lg shadow`}>
            <h2 className={`text-xl font-bold mb-6 ${theme.text}`}>📢 История рассылок</h2>
            {broadcasts.length === 0 ? (
              <p className={theme.textSecondary}>Рассылок пока нет</p>
            ) : (
              <div className="space-y-4">
                {broadcasts.map(broadcast => (
                  <div key={broadcast.id} className={`${theme.border} border p-4 rounded-lg`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className={`text-sm ${theme.textSecondary}`}>
                          {new Date(broadcast.created_at).toLocaleString('ru-RU')}
                        </div>
                        <div className={`mt-2 p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded text-sm whitespace-pre-wrap ${theme.text}`}>
                          {broadcast.message_text}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-3 text-sm">
                      <span className="text-green-600">✅ Отправлено: {broadcast.sent_count}</span>
                      <span className="text-red-600">❌ Ошибок: {broadcast.failed_count}</span>
                      <span className={theme.textSecondary}>Статус: {broadcast.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TELEGRAM - OVERVIEW */}
        {mainTab === 'telegram' && subTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>👥 Пользователей</h3>
              <p className={`text-3xl font-bold ${theme.text}`}>{stats.botUsers}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>📥 Скачиваний</h3>
              <p className="text-3xl font-bold text-green-600">{stats.botDownloads}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>📊 Сегодня</h3>
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
              <h3 className={`${theme.textSecondary} mb-2`}>⚡ Активных за 24ч</h3>
              <p className="text-3xl font-bold text-orange-600">{stats.activeUsers24h}</p>
            </div>
          </div>
        )}


                {/* TELEGRAM - USERS */}
        {mainTab === 'telegram' && subTab === 'users' && (
          <div>
            {/* ✅ Фильтр "Последние 24 часа" */}
            <div className="mb-4 flex items-center gap-3">
              <label className={`flex items-center gap-2 ${theme.text}`}>
                <input
                  type="checkbox"
                  checked={last24hOnly}
                  onChange={(e) => {
                    setLast24hOnly(e.target.checked)
                    setUsersPage(1) // Сброс на первую страницу
                  }}
                  className="w-4 h-4"
                />
                Показать только за последние 24 часа
              </label>
            </div>

            <div className={`${theme.card} rounded-lg shadow overflow-hidden`}>
              {topUsers.length === 0 ? (
                <div className="p-6 text-center">
                  <p className={theme.textSecondary}>Пользователей пока нет</p>
                </div>
              ) : (
                <>
                  <table className="min-w-full">
                    <thead className={theme.tableHeader}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Chat ID</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Username</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Язык</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Текст</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Скачиваний</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Регистрация</th>
                      </tr>
                    </thead>
                    <tbody className={`${theme.card} divide-y ${theme.border}`}>
                      {paginate(filterLast24h(topUsers), usersPage).map((user: User) => (
                        <tr key={user.chat_id} className={theme.hover}>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.text}`}>
                            {user.chat_id}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.text}`}>
                            {user.username ? (
                              <a
                                href={`https://t.me/${user.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                @{user.username}
                              </a>
                            ) : user.first_name ? (
                              <span className={theme.text}>{user.first_name}</span>
                            ) : (
                              <span className={theme.textSecondary}>Нет username</span>
                            )}
                          </td>

                          {/* ✅ КОЛОНКА "ЯЗЫК" */}
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.text}`}>
                            {user.language === 'ru' ? '🇷🇺 Русский' : user.language === 'en' ? '🇺🇸 English' : '—'}
                          </td>
                          {/* ✅ КОЛОНКА "ТЕКСТ" */}
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.text}`}>
                            {user.show_video_text ? (
                              <span className="text-green-600">✅ Вкл</span>
                            ) : (
                              <span className="text-gray-500">❌ Выкл</span>
                            )}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600`}>
                            {user.success_count}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.textSecondary}`}>
                            {new Date(user.created_at).toLocaleString('ru-RU')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* ✅ ПАГИНАЦИЯ */}
                  <Pagination
                    currentPage={usersPage}
                    totalPages={getTotalPages(filterLast24h(topUsers).length)}
                    onPageChange={setUsersPage}
                  />
                </>
              )}
            </div>
          </div>
        )}


                {/* TELEGRAM - DOWNLOADS */}
        {mainTab === 'telegram' && subTab === 'downloads' && (
          <div>
            {/* ✅ Фильтр "Последние 24 часа" */}
            <div className="mb-4 flex items-center gap-3">
              <label className={`flex items-center gap-2 ${theme.text}`}>
                <input
                  type="checkbox"
                  checked={last24hOnly}
                  onChange={(e) => {
                    setLast24hOnly(e.target.checked)
                    setDownloadsPage(1)
                  }}
                  className="w-4 h-4"
                />
                Показать только за последние 24 часа
              </label>
            </div>

            <div className={`${theme.card} rounded-lg shadow overflow-hidden`}>
              <table className="min-w-full">
                <thead className={theme.tableHeader}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Chat ID</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Username</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Sora URL</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>API</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Статус</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Дата</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${theme.textSecondary} uppercase`}>Детали</th>
                  </tr>
                </thead>
                <tbody className={`${theme.card} divide-y ${theme.border}`}>
                  {paginate(filterLast24h(recentTasks), downloadsPage).map((task: any) => (
                    <React.Fragment key={task.id}>
                      <tr className={theme.hover}>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.text}`}>
                          {task.chat_id}
                        </td>
                        {/* ✅ КОЛОНКА "USERNAME" */}
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.text}`}>
                          {task.username ? (
                            <a
                              href={`https://t.me/${task.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              @{task.username}
                            </a>
                          ) : (
                            <span className={theme.textSecondary}>—</span>
                          )}
                        </td>
                        <td className={`px-6 py-4 text-sm`}>
                          <a
                            href={task.sora_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            {task.sora_url.substring(0, 40)}...
                          </a>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm`}>
                          <span className={`px-2 py-1 rounded text-xs ${
                            task.api_used === 'dyysy' ? 'bg-blue-100 text-blue-800' :
                            task.api_used === 'vid7' ? 'bg-purple-100 text-purple-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {task.api_used}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm`}>
                          <span className={`px-2 py-1 rounded text-xs ${
                            task.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {task.status}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.textSecondary}`}>
                          {new Date(task.created_at).toLocaleString('ru-RU')}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm`}>
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
                          <td colSpan={7} className={`px-6 py-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
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
                                  <span className="ml-2">{task.error}</span>
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

              {/* ✅ ПАГИНАЦИЯ */}
              <Pagination
                currentPage={downloadsPage}
                totalPages={getTotalPages(filterLast24h(recentTasks).length)}
                onPageChange={setDownloadsPage}
              />
            </div>
          </div>
        )}


                {/* WEBSITE - OVERVIEW */}
        {mainTab === 'website' && subTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>📥 Скачиваний</h3>
              <p className="text-3xl font-bold text-green-600">{stats.webDownloads}</p>
            </div>
            <div className={`${theme.card} p-6 rounded-lg shadow`}>
              <h3 className={`${theme.textSecondary} mb-2`}>📊 Сегодня</h3>
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
              <h3 className={`${theme.textSecondary} mb-2`}>📈 Доля от общего</h3>
              <p className="text-3xl font-bold text-purple-600">
                {stats.totalDownloads > 0 ? Math.round((stats.webDownloads / stats.totalDownloads) * 100) : 0}%
              </p>
            </div>
          </div>
        )}


        {/* WEBSITE - DOWNLOADS */}
        {mainTab === 'website' && subTab === 'downloads' && (
          <div>
            {/* ✅ Фильтр "Последние 24 часа" */}
            <div className="mb-4 flex items-center gap-3">
              <label className={`flex items-center gap-2 ${theme.text}`}>
                <input
                  type="checkbox"
                  checked={last24hOnly}
                  onChange={(e) => {
                    setLast24hOnly(e.target.checked)
                    setDownloadsPage(1)
                  }}
                  className="w-4 h-4"
                />
                Показать только за последние 24 часа
              </label>
            </div>

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
                  {paginate(filterLast24h(recentWebDownloads), downloadsPage).map((download: any) => (
                    <React.Fragment key={download.id}>
                      <tr className={theme.hover}>
                        <td className={`px-6 py-4 text-sm`}>
                          <a
                            href={download.sora_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            {download.sora_url.substring(0, 40)}...
                          </a>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm`}>
                          <span className={`px-2 py-1 rounded text-xs ${
                            download.api_used === 'dyysy' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
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
                        <td className={`px-6 py-4 whitespace-nowrap text-sm`}>
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

              {/* ✅ ПАГИНАЦИЯ */}
              <Pagination
                currentPage={downloadsPage}
                totalPages={getTotalPages(filterLast24h(recentWebDownloads).length)}
                onPageChange={setDownloadsPage}
              />
            </div>
          </div>
        )}

                {/* GENERAL - ALL DOWNLOADS */}
        {mainTab === 'general' && subTab === 'downloads' && (
          <div>
            {/* ✅ Фильтр "Последние 24 часа" */}
            <div className="mb-4 flex items-center gap-3">
              <label className={`flex items-center gap-2 ${theme.text}`}>
                <input
                  type="checkbox"
                  checked={last24hOnly}
                  onChange={(e) => {
                    setLast24hOnly(e.target.checked)
                    setDownloadsPage(1)
                  }}
                  className="w-4 h-4"
                />
                Показать только за последние 24 часа
              </label>
            </div>

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
                  {paginate(filterLast24h(allDownloads), downloadsPage).map((download: any) => (
                    <React.Fragment key={`${download.source}-${download.id}`}>
                      <tr className={theme.hover}>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm`}>
                          <span className={`px-2 py-1 rounded text-xs ${
                            download.source === 'telegram' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {download.source === 'telegram' ? '🤖 Telegram' : '🌐 Web'}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.text}`}>
                          {download.source === 'telegram' ? (
                            download.username ? (
                              <a
                                href={`https://t.me/${download.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                @{download.username}
                              </a>
                            ) : (
                              `ID: ${download.chat_id}`
                            )
                          ) : (
                            download.ip_address || 'unknown'
                          )}
                        </td>
                        <td className={`px-6 py-4 text-sm`}>
                          <a
                            href={download.sora_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            {download.sora_url.substring(0, 40)}...
                          </a>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm`}>
                          <span className={`px-2 py-1 rounded text-xs ${
                            download.api_used === 'dyysy' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {download.api_used}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme.textSecondary}`}>
                          {new Date(download.created_at).toLocaleString('ru-RU')}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm`}>
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
                              {download.error && (
                                <div>
                                  <span className="font-bold text-red-600">Error:</span>
                                  <span className="ml-2 theme.text">{download.error}</span>
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

                            {/* ✅ ПАГИНАЦИЯ */}
              <Pagination
                currentPage={downloadsPage}
                totalPages={getTotalPages(filterLast24h(allDownloads).length)}
                onPageChange={setDownloadsPage}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}