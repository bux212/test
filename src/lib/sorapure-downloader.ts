import type { VideoResult } from '@/types/video';

interface DownloadResult {
  videoUrl: string;
  title: string;
  apiUsed: string;
}

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
export async function downloadSoraVideo(soraUrl: string): Promise<DownloadResult> {
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
    
    // ⚠️ Проверка на устаревший endpoint
    if (!apiRes.ok || contentType.includes('text/html')) {
      console.log('⚠️ API error detected, invalidating cache...');
      cachedEndpoint = null; // Сбрасываем кэш
      throw new Error(`API returned HTTP ${apiRes.status} or HTML`);
    }
    
    const data = await apiRes.json();
    console.log('📦 API response:', JSON.stringify(data).slice(0, 500));
    
    if (data.links?.mp4) {
      console.log('🔗 Full MP4 URL:', data.links.mp4);
      console.log('✅ dyysy SUCCESS');
      return {
        videoUrl: data.links.mp4,
        title: data.post_info?.title || 'Sora Video',
        apiUsed: 'dyysy'
      };
    }
    
    throw new Error('No MP4 link in dyysy response');
    
  } catch (dyysyError: any) {
    console.log('❌ dyysy failed:', dyysyError.message);
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
      return {
        videoUrl: data.links.mp4,
        title: data.post_info?.title || data.title || 'Sora Video',
        apiUsed: 'soracdn' // ← исправил с 'dyysy' на 'soracdn'
      };
    }
    
    throw new Error('No MP4 link in soracdn response');

  } catch (error: any) {
    console.log('❌ soracdn failed:', error.message);
  }

  // 3. LAST RESORT: vid7.link
  try {
    console.log('🟣 Trying vid7.link (last resort)');
    return await downloadViaVid7(soraUrl);
  } catch (vid7Error: any) {
    console.log('❌ vid7 failed:', vid7Error.message);
  }

  throw new Error('Все API недоступны');
}

function extractVideoId(url: string): string | null {
  // Поддерживаем форматы:
  // https://sora.chatgpt.com/p/s_abc123...
  // https://sora.chatgpt.com/ps/abc123...
  const match = url.match(/\/(?:p\/s_|ps\/)([a-f0-9]{32})/i);
  return match ? match[1] : null;
}

/**
 * Альтернативный API для удаления логотипа (vid7.link)
 */
export async function downloadViaVid7(soraUrl: string): Promise<DownloadResult> {
  const videoId = extractVideoId(soraUrl);
  if (!videoId) throw new Error('Invalid Sora URL');

  console.log('🟣 Trying vid7.link API for video:', videoId);

  try {
    // ✅ ПРАВИЛЬНЫЙ ENDPOINT (POST запрос)
    const apiUrl = 'https://vid7.link/api/sora-download';
    
    console.log('📤 API URL:', apiUrl);
    console.log('📤 Sora URL:', soraUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Origin': 'https://vid7.link',
        'Referer': 'https://vid7.link/sora-ai-video-downloader',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        shareLink: soraUrl
      }),
      signal: AbortSignal.timeout(30000)
    });

    console.log('📦 vid7 status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ vid7 error response:', errorText);
      throw new Error(`vid7 API returned ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 vid7 raw response:', JSON.stringify(data).substring(0, 500));

    if (data.code !== 200 || !data.data || !data.success) {
      throw new Error('vid7 API error: ' + (data.msg || 'Unknown error'));
    }

    // ✅ Извлекаем прямую ссылку на видео из массива downloads
    let videoUrl = null;
    
    if (data.data.downloads && data.data.downloads.length > 0) {
      // Берём первую ссылку (HD без водяного знака)
      videoUrl = data.data.downloads[0].url;
    }
    
    if (!videoUrl) {
      console.error('❌ No video URL in response:', JSON.stringify(data));
      throw new Error('No video URL in vid7 response');
    }

    console.log('🔗 Direct URL from vid7 (no watermark):', videoUrl);

    // Извлекаем title
    let title = 'Untitled';
    if (data.data.prompt) {
      title = data.data.prompt;
    } else if (data.data.title) {
      title = data.data.title;
    }

    return {
      videoUrl: videoUrl,
      title: title,
      apiUsed: 'vid7'
    };

  } catch (error: any) {
    console.error('❌ vid7 API error:', error);
    throw new Error(`vid7 download failed: ${error.message}`);
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
