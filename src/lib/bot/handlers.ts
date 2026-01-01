// src/lib/bot/handlers.ts

import type { VideoResult } from '@/types/video';
import { processSora, processSoraVid7 } from '@/lib/sora-api';
import { Context } from 'telegraf';
import { supabase } from '@/lib/supabase';
import { postVideoToChannel } from '@/lib/telegram-channel';
import { extractFullDescription } from '@/lib/sorapure-downloader';
import { getUserLanguage, t } from '@/lib/i18n';

const processedMessages = new Map();

// Функция очистки старых (старше 10 минут)
function cleanOldMessages() {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  for (const [key, timestamp] of processedMessages.entries()) {
    if (now - timestamp > tenMinutes) {
      processedMessages.delete(key);
    }
  }
}

// Очистка каждую минуту
setInterval(cleanOldMessages, 60 * 1000);

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

export async function processUrl(ctx: Context, url: string, index?: number, total?: number) {
  const chatId = ctx.from!.id;
  const username = ctx.from!.username;
  const lang = await getUserLanguage(chatId);

  const prefix = index !== undefined && total !== undefined
    ? `[${index}/${total}] `
    : index !== undefined
    ? `[${index}] `
    : '';

  try {
    const statusMsg = await ctx.reply(`${prefix}${t(lang, 'processing')}`);
    const result = await processSora(url);
    const videoId = url.match(/([a-f0-9]{32})/i)?.[1] || '';

    let fileSize = 'unknown';
    try {
      const headResponse = await fetch(result.videoUrl, { method: 'HEAD' });
      const contentLength = headResponse.headers.get('content-length');
      if (contentLength) {
        const bytes = parseInt(contentLength);
        fileSize = formatFileSize(bytes);
      }
    } catch (e) {
      console.log('⚠️ Could not fetch file size');
    }

    const proxyUrl = await createProxyUrl(
      result.videoUrl,
      url,
      result.apiUsed,
      chatId,
      result.title
    );

    await ctx.telegram.deleteMessage(chatId, statusMsg.message_id).catch(() => {});

    // ✅ ПОЛУЧАЕМ НАСТРОЙКУ ПОЛЬЗОВАТЕЛЯ
    const { data: userData } = await supabase
      .from('users')
      .select('show_video_text, success_count')
      .eq('chat_id', chatId)
      .single();

    const showVideoText = userData?.show_video_text ?? false;
    const successCount = userData?.success_count ?? 0;

    // Получаем полное описание
    const fullDescription = extractFullDescription(result.title);

    // ✅ ФОРМИРУЕМ CAPTION (короткий текст всегда в caption)
    let captionText = `${prefix}${t(lang, 'done')}\n${t(lang, 'fileSize', { size: fileSize })}`;

    // Если включен текст И описание короткое (≤ 900 символов), добавляем в caption
    if (showVideoText && fullDescription && fullDescription.length <= 900) {
      captionText += `\n\n🎬 ${t(lang, 'videoDescription')}:\n\`\`\`\n${fullDescription}\n\`\`\``;
    }

    // Отправляем видео с caption
    const videoMessage = await ctx.replyWithVideo(
      { url: proxyUrl },
      {
        caption: captionText,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: t(lang, 'btnWatermark'), callback_data: `retry:${videoId}` }]]
        }
      }
    );

    // ✅ Если текст включен И описание длинное (> 900 символов), отправляем отдельным сообщением
    if (showVideoText && fullDescription && fullDescription.length > 900) {
      await ctx.reply(
        `🎬 ${t(lang, 'videoDescription')}:\n\`\`\`\n${fullDescription}\n\`\`\``,
        {
          parse_mode: 'Markdown',
          reply_parameters: { message_id: videoMessage.message_id }
        }
      );
      console.log('✅ Posted full description as reply');
    }

    // Постим в канал с полным описанием
    await postVideoToChannel({
      videoUrl: proxyUrl,
      fileSize: fileSize,
      username: username,
      chatId: chatId,
      soraUrl: url,
      apiUsed: result.apiUsed as 'dyysy' | 'vid7',
      fullDescription: fullDescription,
      title: result.title
    });

    // Увеличиваем счетчик на 1
    await supabase
      .from('users')
      .update({ success_count: successCount + 1 })
      .eq('chat_id', chatId);

  } catch (error: any) {
    console.error(`Error processing ${url}:`, error);

    let errorMessage = t(lang, 'errGeneric');
    if (error.message?.includes('not found')) {
      errorMessage = t(lang, 'errVideoNotFound');
    } else if (error.message?.includes('timeout')) {
      errorMessage = t(lang, 'errTimeout');
    }

    await ctx.reply(
      `${prefix}${errorMessage}\n\n📎 URL: ${url.substring(0, 50)}...\n\n${t(lang, 'errPersists')}`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: t(lang, 'btnContactSupport'), url: 'https://t.me/feedbckbot' }
          ]]
        }
      }
    );

    await supabase.from('tasks').insert({
      chat_id: chatId,
      sora_url: url,
      api_used: 'error',
      status: 'error',
      error: error.message || 'Unknown error'
    });
  }
}


function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
