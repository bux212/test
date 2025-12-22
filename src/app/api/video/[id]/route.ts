// src/app/api/video/[id]/route.ts
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCachedVideo, setCachedVideo } from '@/lib/video-cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cachedBuffer = getCachedVideo(id);
    if (cachedBuffer) {
      return new Response(new Uint8Array(cachedBuffer), { // ← Преобразуем Buffer в Uint8Array
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': 'inline',
          'Cache-Control': 'public, max-age=3600',
          'X-Cache': 'HIT'
        }
      });
    }

    // Пробуем из tasks (Telegram)
    let { data: task, error } = await supabase
      .from('tasks')
      .select('result_url')
      .eq('id', id)
      .single();

    // Если не нашли, пробуем из web_downloads
    if (error || !task) {
      const { data: webDownload } = await supabase
        .from('web_downloads')
        .select('result_url')
        .eq('id', id)
        .single();
      
      if (webDownload) {
        task = webDownload;
      }
    }

    if (!task || !task.result_url) {
      return new Response('Video not found', { status: 404 });
    }

    const videoResponse = await fetch(task.result_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!videoResponse.ok) {
      return new Response('Video unavailable', { status: 404 });
    }

    const videoBlob = await videoResponse.blob();
    const buffer = Buffer.from(await videoBlob.arrayBuffer());

    setCachedVideo(id, buffer);

    return new Response(new Uint8Array(buffer), { // ← Преобразуем Buffer в Uint8Array
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'MISS',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return new Response('Server error', { status: 500 });
  }
}
