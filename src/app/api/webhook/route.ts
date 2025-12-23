// src/app/api/webhook/route.ts
import { bot } from '@/lib/bot-instance';

// Импортируй команды (это выполнит код регистрации команд)
import './commands';

const processedUpdates = new Set<number>();

setInterval(() => {
  if (processedUpdates.size > 1000) {
    processedUpdates.clear();
  }
}, 5 * 60 * 1000);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Дедупликация
    if (body.update_id && processedUpdates.has(body.update_id)) {
      console.log(`⚠️ Duplicate update_id: ${body.update_id}`);
      return new Response('OK', { status: 200 });
    }
    
    if (body.update_id) {
      processedUpdates.add(body.update_id);
    }

    // Обрабатываем синхронно (вернул await)
    await bot.handleUpdate(body);
    
    return new Response('OK', { status: 200 });
    
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('OK', { status: 200 });
  }
}

export const maxDuration = 60;
export const dynamic = 'force-dynamic';