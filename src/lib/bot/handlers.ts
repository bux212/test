// src/lib/bot/handlers.ts
import { Context } from 'telegraf';
import { supabase } from '@/lib/supabase';
import { processSora, processSoraVid7 } from '@/lib/sora-api';

export const ERROR_MESSAGES = {
  RATE_LIMIT: '⏱️ Слишком много запросов! Подождите минуту.',
  BUTTON_COOLDOWN: '⏱️ Подождите 10 секунд перед следующим кликом.',
  INVALID_URL: '❌ Отправьте корректную ссылку sora.chatgpt.com\n\nПример:\nhttps://sora.chatgpt.com/p/s_abc123...',
  TOO_MANY_URLS: '❌ Максимум 5 ссылок за раз! Вы отправили: {count}',
  API_ERROR: '❌ Ошибка при скачивании. Попробуйте позже.',
  VIDEO_NOT_FOUND: '❌ Видео не найдено. Проверьте ссылку или видео удалено.',
  NETWORK_ERROR: '❌ Проблема с сетью. Попробуйте через минуту.',
  VIDEO_PRIVATE: '❌ Видео приватное или ограничен доступ.',
  API_SERVER_ERROR: '❌ Сервер API временно недоступен. Попробуйте позже.',
  INVALID_VIDEO_URL: '❌ Некорректная ссылка на видео.',
  UNKNOWN_ERROR: '❌ Неизвестная ошибка. Попробуйте другую ссылку.'
};

export async function createProxyUrl(
  videoUrl: string,
  soraUrl: string,
  apiUsed: string,
  chatId: number,
  title?: string
): Promise<string> {
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      chat_id: chatId,
      sora_url: soraUrl,
      api_used: apiUsed,
      status: 'success',
      result_url: videoUrl,
      title: title || null
    })
    .select('id')
    .single();

  if (error || !task) {
    console.error('Failed to create proxy URL:', error);
    return videoUrl;
  }

  const baseUrl =
    process.env.WEBHOOK_URL?.replace('/api/webhook', '') ||
    'https://sora-bot-five.vercel.app';

  return `${baseUrl}/api/video/${task.id}`;
}

export async function processUrl(ctx: Context, url: string, index?: number) {
  const chatId = ctx.from!.id;
  const prefix = index !== undefined ? `[${index}/5] ` : '';

  try {
    const statusMsg = await ctx.reply(`${prefix}⏳ Обработка...`);
    const result = await processSora(url);
    const videoId = url.match(/([a-f0-9]{32})/i)?.[1] || '';

    const proxyUrl = await createProxyUrl(
      result.videoUrl,
      url,
      result.apiUsed,
      chatId,
      result.title
    );

    await ctx.telegram.deleteMessage(chatId, statusMsg.message_id).catch(() => {});

    await ctx.replyWithVideo(
      { url: proxyUrl },
      {
        caption: `${prefix}✅ Готово`,
        reply_markup: {
          inline_keyboard: [[{ text: '✨ Скачать 2', callback_data: `retry:${videoId}` }]]
        }
      }
    );

    await supabase.rpc('increment_success_count', { user_chat_id: chatId });
  } catch (error: any) {
    console.error(`Error processing ${url}:`, error);

    // здесь оставляете ту же обработку ошибок, что и сейчас
  }
}
