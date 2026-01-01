// src/app/api/webhook/route.ts

import { bot } from '@/lib/bot-instance';
import '@/app/api/webhook/commands';

const processedUpdates = new Set<number>();

setInterval(() => {
  if (processedUpdates.size > 1000) {
    processedUpdates.clear();
  }
}, 5 * 60 * 1000);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // ✅ ДОБАВИТЬ: Логируем ТИП входящего обновления
    console.log('📨 [WEBHOOK] Received update:', {
      update_id: body.update_id,
      has_message: !!body.message,
      has_callback_query: !!body.callback_query,
      callback_data: body.callback_query?.data,
      from_id: body.callback_query?.from?.id || body.message?.from?.id
    });

    // Дедупликация
    if (body.update_id && processedUpdates.has(body.update_id)) {
      console.log(`⚠️ Duplicate update_id: ${body.update_id}`);
      return new Response('OK', { status: 200 });
    }

    if (body.update_id) {
      processedUpdates.add(body.update_id);
    }

    console.log('🔄 [WEBHOOK] Calling bot.handleUpdate...');
    
    // Обрабатываем синхронно
    await bot.handleUpdate(body);
    
    console.log('✅ [WEBHOOK] bot.handleUpdate completed');
    return new Response('OK', { status: 200 });
  } catch (e) {
    console.error('❌ [WEBHOOK] Error:', e);
    return new Response('OK', { status: 200 });
  }
}

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
