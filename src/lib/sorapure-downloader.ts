import type { VideoResult } from '@/types/video';



// Глобальный кэш для endpoint
let cachedEndpoint: { value: string; timestamp: number } | null = null;
const CACHE_TTL = 3600000; // 1 час в миллисекундах

/**
 * Получает актуальный endpoint из script.js с кэшированием
 */
async function getEndpoint(): Promise<string> {
  const now = Date.now();
  
  // Проверяем кэш
  if (cachedEndpoint && (now - cachedEndpoint.timestamp) < CACHE_TTL) {
    console.log('✅ Using cached endpoint:', cachedEndpoint.value, `(age: ${Math.round((now - cachedEndpoint.timestamp) / 1000)}s)`);
    return cachedEndpoint.value;
  }
  
  console.log('🔄 Cache expired or empty, fetching script.js...');
  
  // Парсим script.js
  const scriptRes = await fetch('https://dyysy.com/script.js', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    signal: AbortSignal.timeout(15000)
  });

  if (!scriptRes.ok) {
    throw new Error(`Failed to fetch script.js: HTTP ${scriptRes.status}`);
  }

  const scriptBody = await scriptRes.text();
  console.log('📦 script.js fetched, length:', scriptBody.length);

  // Извлекаем endpoint
  const match = scriptBody.match(/\/(\w+)\/\$\{encodeURIComponent\(url\)\}/);
  
  if (!match || !match[1]) {
    throw new Error('Failed to extract endpoint from script.js');
  }

  const endpoint = match[1];
  
  // Сохраняем в кэш
  cachedEndpoint = { value: endpoint, timestamp: now };
  console.log('✅ Extracted and cached endpoint:', endpoint);
  
  return endpoint;
}

/**
 * Основная функция скачивания видео
 */
export async function downloadSoraVideo(soraUrl: string): Promise<VideoResult> {
  const videoId = soraUrl.match(/(?:ps|p\/s_|s_)([a-f0-9]{32})/i)?.[1];
  if (!videoId) throw new Error('Invalid Sora URL');

  console.log('🎬 Video ID:', videoId);

  //let result = { videoUrl: '', title: '', source: '' };

  // 1. PRIMARY: api.dyysy.com
  try {
    console.log('🔵 Step 1: Getting endpoint (with cache)');
    
    const endpoint = await getEndpoint();
    console.log('📍 Current endpoint:', endpoint);

    const cleanUrl = soraUrl.split('?')[0];
    const apiUrl = `https://api.dyysy.com/${endpoint}/${cleanUrl}`;
    console.log('📤 API URL:', apiUrl);

    const apiRes = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(25000)
    });

    const contentType = apiRes.headers.get('content-type') || '';
    console.log('📦 Content-Type:', contentType);

    // ⚠️ НОВОЕ: Проверка на устаревший endpoint
    if (!apiRes.ok || contentType.includes('text/html')) {
      console.log('⚠️ API error detected, invalidating cache...');
      cachedEndpoint = null; // Сбрасываем кэш
      
      // Если это первая попытка, пробуем получить свежий endpoint
      if (cachedEndpoint === null) {
        console.log('🔄 Retrying with fresh endpoint...');
        const freshEndpoint = await getEndpoint(); // Получит новый
        const retryUrl = `https://api.dyysy.com/${freshEndpoint}/${cleanUrl}`;
        console.log('📤 Retry URL:', retryUrl);
        
        const retryRes = await fetch(retryUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(25000)
        });
        
        if (retryRes.ok && !retryRes.headers.get('content-type')?.includes('text/html')) {
          const retryData = await retryRes.json();
          if (retryData.links?.mp4) {
            console.log('✅ dyysy SUCCESS (after retry)');
            return{
              videoUrl: retryData.links.mp4,
              title: retryData.post_info?.title || 'Sora Video',
              apiUsed: 'dyysy'
            };
          }
        }
      }
      
      throw new Error(`API returned HTTP ${apiRes.status} or HTML`);
    }

    const data = await apiRes.json();
    console.log('📦 API response:', JSON.stringify(data).slice(0, 500));

    if (data.links?.mp4) {
      console.log('🔗 Full MP4 URL:', data.links.mp4); // <- Добавь эту строку
      console.log('🔗 MD URL (low quality):', data.links?.md); // <- И эту
      console.log('🔗 GIF URL:', data.links?.gif); // <- И эту для сравнения
      
      console.log('✅ dyysy SUCCESS');
      return {
        videoUrl: data.links.mp4,
        title: data.post_info?.title || 'Sora Video',
        apiUsed: 'dyysy'
      };
    }

    throw new Error('No MP4 link in response');

  } catch (error: any) {
    console.log('❌ dyysy failed:', error.message);
  }

  // 2. FALLBACK: soracdn.workers.dev
  try {
    console.log('🟡 Trying soracdn.workers.dev (fallback)');
    
    const cleanUrl = soraUrl.split('?')[0];
    const encodedUrl = encodeURIComponent(cleanUrl);
    
    const res = await fetch(`https://api.soracdn.workers.dev/api-proxy/${encodedUrl}`, {
      headers: {
        'Origin': 'https://snapsora.net',
        'Referer': 'https://snapsora.net/',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    console.log('📦 soracdn response:', JSON.stringify(data).slice(0, 500));
    
    if (data.links?.mp4) {
      console.log('✅ soracdn SUCCESS');
      return{
        videoUrl: data.links.mp4,
        title: data.post_info?.title || data.title || 'Sora Video',
        apiUsed: 'dyysy'
      };
      
    }
    
    return {
    videoUrl: data.links.mp4,
    title: data.post_info?.title || 'Sora Video',
    apiUsed: 'dyysy'
  };

  } catch (error: any) {
    console.log('❌ soracdn failed:', error.message);
  }

  throw new Error('Все API недоступны');
}

/**
 * Альтернативный API для удаления логотипа (vid7.link)
 */
export async function downloadViaVid7(soraUrl: string): Promise<VideoResult> {
  const videoId = soraUrl.match(/(?:ps|p\/s_|s_)([a-f0-9]{32})/i)?.[1];
  if (!videoId) throw new Error('Invalid Sora URL');

  console.log('🟣 Trying vid7.link API for video:', videoId);

  try {
    const cleanUrl = soraUrl.split('?')[0];
    
    const res = await fetch('https://vid7.link/api/sora-download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://vid7.link/sora-ai-video-downloader',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        shareLink: cleanUrl
      }),
      signal: AbortSignal.timeout(30000)
    });

    const responseText = await res.text();
    console.log('📦 vid7 status:', res.status);
    console.log('📦 vid7 raw response:', responseText.slice(0, 500));

    if (!res.ok) {
      throw new Error(`vid7 HTTP ${res.status}`);
    }

    const data = JSON.parse(responseText);

    // ✅ ИСПРАВЛЕНИЕ: downloads — это МАССИВ
    if (data.code !== 200 || !Array.isArray(data.data?.downloads) || data.data.downloads.length === 0) {
      console.error('📦 Full vid7 response:', JSON.stringify(data, null, 2));
      throw new Error('No direct URL in vid7 response');
    }

    const firstDownload = data.data.downloads[0];
    
    if (!firstDownload?.url) {
      throw new Error('No download URL in vid7 response');
    }

    const directUrl = firstDownload.url;
    console.log('🔗 Direct URL from vid7 (raw):', directUrl);

    // Используем прокси vid7 для обхода CORS
    const proxyUrl = `https://dl.vid7.link/api/proxy-download?url=${encodeURIComponent(directUrl)}&type=video`;
    
    console.log('🔗 Proxy URL (final):', proxyUrl.slice(0, 200));
    
    return {
      videoUrl: proxyUrl,
      title: extractTitle(data.data.title) || 'Sora Video',
      apiUsed: 'vid7'
    };

  } catch (error: any) {    
    console.error('❌ vid7 failed:', error.message);
    throw error;
  }
}

// Вспомогательная функция для извлечения title из JSON-строки
function extractTitle(titleField: string): string {
  if (!titleField) return 'Sora Video';
  
  try {
    // Если title - это JSON-строка
    if (titleField.trim().startsWith('{')) {
      const parsed = JSON.parse(titleField);
      return parsed.title || 'Sora Video';
    }
    return titleField;
  } catch {
    return titleField.slice(0, 100);
  }
}


/**
 * Извлекает полное описание из title поля
 */
export function extractFullDescription(titleField: string): string {
  if (!titleField) return '';
  
  try {
    // Если это JSON-строка, возвращаем её в читаемом виде
    if (titleField.trim().startsWith('{')) {
      const parsed = JSON.parse(titleField);
      return JSON.stringify(parsed, null, 2);
    }
    return titleField;
  } catch {
    return titleField;
  }
}



/**
 * Возвращает возраст кэша в секундах (или null, если кэш пуст)
 */
export function getCacheAge(): number | null {
  if (!cachedEndpoint) return null;
  return Math.round((Date.now() - cachedEndpoint.timestamp) / 1000);
}
