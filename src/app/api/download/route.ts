// src/app/api/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processSora, processSoraVid7 } from '@/lib/sora-api';
import { supabase } from '@/lib/supabase';
import { postVideoToChannel } from '@/lib/telegram-channel';

export async function POST(request: NextRequest) {
  try {
    const { url, removeWatermark } = await request.json();

    if (!url || !url.match(/sora\.chatgpt\.com\/(ps|p\/s_)[a-f0-9]{32}/i)) {
      return NextResponse.json(
        { error: 'Некорректная ссылка на Sora видео' },
        { status: 400 }
      );
    }

    const result = removeWatermark 
      ? await processSoraVid7(url)
      : await processSora(url);

    // Получаем IP для логирования (опционально)
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Сохраняем в отдельную таблицу для веб-версии
    const { data: download, error } = await supabase
      .from('web_downloads')
      .insert({
        sora_url: url,
        api_used: result.apiUsed,
        result_url: result.videoUrl,
        title: result.title || null,
        ip_address: ip,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      // Возвращаем прямую ссылку если не удалось сохранить
      return NextResponse.json(result);
    }

    const baseUrl = request.nextUrl.origin;
    const proxyUrl = `${baseUrl}/api/video/${download.id}`;

    // Постим в канал (опционально)
    try {
      await postVideoToChannel({
        videoUrl: proxyUrl,
        caption: `✅ ${result.title}\n🌐 Скачано с сайта`,
        chatId: 0,
        soraUrl: url,
        apiUsed: result.apiUsed,
        source: 'website',
        userId: 0,
        username: 'web'
      });
    } catch (channelError) {
      // Игнорируем ошибки постинга в канал для веб-версии
      console.log('Channel post skipped for web download');
    }

    return NextResponse.json({
      ...result,
      videoUrl: proxyUrl
    });

  } catch (error: any) {
    console.error('Download API error:', error);

    let errorMessage = 'Ошибка при скачивании видео';
    
    if (error.message?.includes('not found')) {
      errorMessage = 'Видео не найдено или удалено';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Превышено время ожидания';
    } else if (error.message?.includes('private')) {
      errorMessage = 'Видео приватное';
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
