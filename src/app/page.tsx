// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [downloadType, setDownloadType] = useState<'standard' | 'premium' | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const handleDownload = async (removeWatermark = false) => {
    setLoading(true);
    setError('');
    setResult(null);
    setDownloadType(removeWatermark ? 'premium' : 'standard');

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, removeWatermark })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Ошибка при скачивании');
        return;
      }

      setResult(data);
    } catch (err) {
      setError('Ошибка сети. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const theme = {
    bg: darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-purple-50',
    card: darkMode ? 'bg-gray-800' : 'bg-white',
    text: darkMode ? 'text-white' : 'text-gray-900',
    textSecondary: darkMode ? 'text-gray-400' : 'text-gray-600',
    input: darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300',
    inputFocus: darkMode ? 'focus:ring-blue-500' : 'focus:ring-blue-500',
  };

  return (
    <div className={`min-h-screen ${theme.bg} py-12 px-4 transition-colors duration-300`}>
      <div className="max-w-3xl mx-auto">
        <div className={`${theme.card} rounded-2xl shadow-xl p-8 transition-colors duration-300`}>
          {/* Header with Theme Toggle */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1">
              <h1 className={`text-4xl font-bold ${theme.text} mb-2`}>
                🎬 Sora Video Downloader
              </h1>
              <p className={theme.textSecondary}>
                Скачивайте видео из Sora AI быстро и удобно
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className={`${theme.card} p-3 rounded-lg shadow-md hover:shadow-lg transition-shadow ml-4`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                Ссылка на Sora видео
              </label>
              <input
                type="text"
                placeholder="https://sora.chatgpt.com/p/s_..."
                className={`w-full p-4 border rounded-lg ${theme.input} ${theme.inputFocus} focus:border-transparent transition-all`}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleDownload(false)}
                disabled={loading || !url}
                className="bg-blue-500 text-white py-4 px-6 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-all transform hover:scale-105 active:scale-95"
              >
                {loading && downloadType === 'standard' ? '⏳ Загрузка...' : '📥 Скачать'}
              </button>
              <button
                onClick={() => handleDownload(true)}
                disabled={loading || !url}
                className="bg-purple-500 text-white py-4 px-6 rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-all transform hover:scale-105 active:scale-95"
              >
                {loading && downloadType === 'premium' ? '⏳ Загрузка...' : '✨ Скачать 2'}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-shake">
                ❌ {error}
              </div>
            )}

            {result && (
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-green-50'} border ${darkMode ? 'border-gray-600' : 'border-green-200'} rounded-lg p-6 transition-all`}>
                <h3 className={`font-bold ${darkMode ? 'text-green-400' : 'text-green-800'} mb-4 flex items-center gap-2`}>
                  <span className="text-2xl">✅</span>
                  <span>Готово!</span>
                </h3>
                
                <div className="space-y-4">
                  {result.title && (
                    <div>
                      <p className={`text-sm ${theme.textSecondary} mb-1`}>Название:</p>
                      <p className={`font-medium ${theme.text}`}>{result.title}</p>
                    </div>
                  )}

                  {/* Video Player */}
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
                    <video
                      controls
                      controlsList="nodownload"
                      className="w-full h-full"
                      src={result.videoUrl}
                    >
                      Ваш браузер не поддерживает видео.
                    </video>
                  </div>

                  {/* Download Button */}
                  <a
                    href={result.videoUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block w-full ${darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} text-white text-center py-4 px-6 rounded-lg font-medium transition-all transform hover:scale-105 active:scale-95 shadow-md`}
                  >
                    💾 Сохранить видео
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className={`mt-8 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`font-bold ${theme.text} mb-3 flex items-center gap-2`}>
              <span className="text-xl">💡</span>
              Как использовать:
            </h3>
            <ol className={`list-decimal list-inside space-y-2 ${theme.textSecondary}`}>
              <li>Скопируйте ссылку на видео из Sora AI</li>
              <li>Вставьте ее в поле выше</li>
              <li>Нажмите "Скачать" или "Скачать 2" для альтернативного качества</li>
              <li>Посмотрите превью и сохраните видео</li>
            </ol>
          </div>

          {/* Telegram Bot Link */}
          <div className="mt-6 text-center">
            <a
              href={`https://t.me/${process.env.NEXT_PUBLIC_BOT_USERNAME || 'YOUR_BOT'}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-600'} transition-colors`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
              <span className="font-medium">Попробуйте наш Telegram бот</span>
            </a>
          </div>

          {/* Footer Stats */}
          <div className={`mt-8 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} text-center`}>
            <p className={`text-sm ${theme.textSecondary}`}>
              Быстро • Бесплатно • Без регистрации
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}