'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [fileSize, setFileSize] = useState<string>('');
  const [darkMode, setDarkMode] = useState(false);

  // Загружаем тему из localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
    }
  }, []);

  // Применяем тему
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleDownload = async (removeWatermark: boolean = false) => {
    if (!url.trim()) {
      setError('Введите ссылку на Sora видео');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setFileSize('');

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, removeWatermark })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка загрузки');
      }

      const data = await response.json();
      setResult(data);

      // Получаем размер файла
      try {
        const headResponse = await fetch(data.videoUrl, { method: 'HEAD' });
        const contentLength = headResponse.headers.get('content-length');
        if (contentLength) {
          const bytes = parseInt(contentLength);
          setFileSize(formatFileSize(bytes));
        }
      } catch (e) {
        console.log('Could not fetch file size');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900' 
        : 'bg-gradient-to-br from-cyan-400 via-blue-400 to-blue-500'
    }`}>
      <div className="container mx-auto px-4 py-12">
        {/* Theme Toggle Button */}
        <div className="fixed top-6 right-6 z-50">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-3 rounded-full shadow-xl transition-all transform hover:scale-110 ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-yellow-300' 
                : 'bg-white hover:bg-gray-50 text-gray-700'
            }`}
            aria-label="Переключить тему"
          >
            <span className="text-2xl">{darkMode ? '☀️' : '🌙'}</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className={`text-5xl md:text-6xl font-bold mb-4 ${
            darkMode ? 'text-white' : 'text-white drop-shadow-lg'
          }`}>
            🎬 Sora Video Downloader
          </h1>
          <p className={`text-xl md:text-2xl ${
            darkMode ? 'text-gray-300' : 'text-white/90'
          }`}>
            Скачивайте видео из Sora AI быстро и бесплатно
          </p>
        </div>

        {/* Main Card */}
        <div className="max-w-4xl mx-auto">
          <div className={`rounded-3xl shadow-2xl p-8 backdrop-blur-sm ${
            darkMode ? 'bg-gray-800/90' : 'bg-white/95'
          }`}>
            {/* Input */}
            <div className="mb-6">
              <label className={`block font-semibold mb-3 text-lg ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                📎 Ссылка на Sora видео
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://sora.chatgpt.com/p/s_...."
                className={`w-full px-5 py-4 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all text-lg ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/30' 
                    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-100'
                }`}
                disabled={loading}
              />
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => handleDownload(false)}
                disabled={loading}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-4 px-8 rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-lg"
              >
                {loading ? '⏳ Загрузка...' : '📥 Скачать видео'}
              </button>
              
              <button
                onClick={() => handleDownload(true)}
                disabled={loading}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 px-8 rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-lg"
              >
                {loading ? '⏳ Загрузка...' : '🔄 Альтернативная версия'}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className={`border-l-4 p-5 rounded-xl mb-6 ${
                darkMode 
                  ? 'bg-red-900/30 border-red-500 text-red-300' 
                  : 'bg-red-50 border-red-500 text-red-700'
              }`}>
                <p className="font-semibold">❌ {error}</p>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className={`border-l-4 p-6 rounded-xl ${
                darkMode 
                  ? 'bg-green-900/30 border-green-500' 
                  : 'bg-green-50 border-green-500'
              }`}>
                <h3 className={`text-xl font-bold mb-4 ${
                  darkMode ? 'text-green-300' : 'text-green-900'
                }`}>
                  ✅ Видео готово!
                </h3>
                
                {fileSize && (
                  <div className={`mb-5 text-lg ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <span className="font-semibold">📦 Размер файла:</span> <span className="font-bold text-blue-600">{fileSize}</span>
                  </div>
                )}

                <div className="mb-6">
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <video
                      src={result.videoUrl}
                      controls
                      className="absolute top-0 left-0 w-full h-full rounded-xl shadow-2xl object-contain bg-black"
                      preload="metadata"
                    />
                  </div>
                </div>

                <a
                  href={result.videoUrl}
                  download
                  className="inline-block bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-4 px-8 rounded-xl hover:from-green-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  💾 Скачать на устройство
                </a>
              </div>
            )}
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className={`rounded-2xl shadow-xl p-6 text-center backdrop-blur-sm transition-transform hover:scale-105 ${
              darkMode ? 'bg-gray-800/90' : 'bg-white/95'
            }`}>
              <div className="text-5xl mb-4">⚡</div>
              <h3 className={`font-bold text-xl mb-2 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Быстро
              </h3>
              <p className={`${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Загрузка за несколько секунд
              </p>
            </div>
            
            <div className={`rounded-2xl shadow-xl p-6 text-center backdrop-blur-sm transition-transform hover:scale-105 ${
              darkMode ? 'bg-gray-800/90' : 'bg-white/95'
            }`}>
              <div className="text-5xl mb-4">🆓</div>
              <h3 className={`font-bold text-xl mb-2 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Бесплатно
              </h3>
              <p className={`${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Без регистрации и ограничений
              </p>
            </div>
            
            <div className={`rounded-2xl shadow-xl p-6 text-center backdrop-blur-sm transition-transform hover:scale-105 ${
              darkMode ? 'bg-gray-800/90' : 'bg-white/95'
            }`}>
              <div className="text-5xl mb-4">🎨</div>
              <h3 className={`font-bold text-xl mb-2 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                HD качество
              </h3>
              <p className={`${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Максимальное качество видео
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className={`text-center mt-12 ${
            darkMode ? 'text-gray-300' : 'text-white/90'
          }`}>
            <p className="mb-3 text-lg">
              💬 Также доступен в{' '}
              <a 
                href="https://t.me/YourBotUsername" 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`font-bold hover:underline transition-colors ${
                  darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-white hover:text-blue-100'
                }`}
              >
                Telegram боте
              </a>
            </p>
            <p className="text-sm opacity-80">
              🔄 Альтернативная версия - это запасной способ скачивания через другой API
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
