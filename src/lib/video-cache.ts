// src/lib/video-cache.ts

interface CacheItem {
  buffer: Buffer;
  timestamp: number;
  contentType: string;
}

const cache = new Map<string, CacheItem>();
const CACHE_TTL = 3600000; // 1 час
const MAX_CACHE_SIZE = 50; // максимум 50 видео

export function getCachedVideo(id: string): Buffer | null {
  const item = cache.get(id);
  
  if (!item) return null;
  
  // Проверка срока действия
  if (Date.now() - item.timestamp > CACHE_TTL) {
    cache.delete(id);
    return null;
  }
  
  return item.buffer;
}

export function setCachedVideo(id: string, buffer: Buffer, contentType: string = 'video/mp4'): void {
  // Удаляем самый старый элемент если кэш переполнен
  if (cache.size >= MAX_CACHE_SIZE) {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();
    
    for (const [key, item] of cache.entries()) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }
  
  cache.set(id, {
    buffer,
    timestamp: Date.now(),
    contentType
  });
}

// Опционально: функция для очистки устаревших записей
export function cleanExpiredCache(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  for (const [key, item] of cache.entries()) {
    if (now - item.timestamp > CACHE_TTL) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => cache.delete(key));
  
  return;
}

// Опционально: получить статистику кэша
export function getCacheStats() {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    items: Array.from(cache.entries()).map(([key, item]) => ({
      key,
      timestamp: item.timestamp,
      age: Date.now() - item.timestamp,
      size: item.buffer.length
    }))
  };
}

// Опционально: очистить весь кэш
export function clearCache(): void {
  cache.clear();
}