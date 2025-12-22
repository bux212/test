// src/lib/sora-api.ts
import { downloadSoraVideo, downloadViaVid7 } from './sorapure-downloader';

export async function processSora(soraUrl: string) {
  try {
    const result = await downloadSoraVideo(soraUrl);
    
    return {
      videoUrl: result.videoUrl,
      title: result.title,
      apiUsed: result.source
    };
  } catch (error: any) {
    console.error('processSora error:', error);
    
    // Обработка специфичных ошибок
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      throw new Error('Video not found');
    }
    if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
      throw new Error('Network timeout');
    }
    if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
      throw new Error('Video is private or restricted');
    }
    if (error.message?.includes('500') || error.message?.includes('502')) {
      throw new Error('API server error');
    }
    
    // Пробрасываем оригинальную ошибку
    throw error;
  }
}

export async function processSoraVid7(soraUrl: string) {
  try {
    const result = await downloadViaVid7(soraUrl);
    
    return {
      videoUrl: result.videoUrl,
      title: result.title,
      apiUsed: result.source
    };
  } catch (error: any) {
    console.error('processSoraVid7 error:', error);
    
    // Обработка специфичных ошибок
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      throw new Error('Video not found');
    }
    if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
      throw new Error('Network timeout');
    }
    if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
      throw new Error('Video is private or restricted');
    }
    if (error.message?.includes('400') || error.message?.includes('Bad Request')) {
      throw new Error('Invalid video URL or API error');
    }
    
    // Пробрасываем оригинальную ошибку
    throw error;
  }
}
