// src/app/api/webhook/commands.ts
import { bot } from '@/lib/bot-instance';
import { processUrl, ERROR_MESSAGES } from '@/lib/bot/handlers';
import { checkRateLimit, checkButtonCooldown } from '@/lib/bot/rate-limit'; // <- Добавил checkButtonCooldown
import { supabase } from '@/lib/supabase';
import { processSoraVid7 } from '@/lib/sora-api'; // <- Добавил
import { postVideoToChannel } from '@/lib/telegram-channel'; // <- Добавил
import { extractFullDescription } from '@/lib/sorapure-downloader';

const ADMIN_ID = parseInt(process.env.ADMIN_ID || '0');

// Функция форматирования размера (добавь)
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

bot.command('start', async (ctx) => {
  const chatId = ctx.from.id;
  const username = ctx.from.username || null;

  await supabase
    .from('users')
    .upsert({ 
      chat_id: chatId, 
      username: username,
      created_at: new Date().toISOString()
    }, { 
      onConflict: 'chat_id' 
    });

  await ctx.reply(
    '👋 Привет! Я бот для скачивания видео из Sora AI.\n\n' +
    '📝 Как использовать:\n' +
    '1. Отправь ссылку на Sora видео\n' +
    '2. Получи видео\n' +
    '3. Нажми кнопку "❌ Логотип на видео" если остался логотип\n\n' +
    '💡 Можно отправить до 5 ссылок за раз (каждая с новой строки)\n\n' +
    '⚡️ Лимиты: 10 запросов в минуту\n\n' +
    '❓ Есть вопросы? /support',
    {
      reply_markup: {
        inline_keyboard: [[
          { text: '💬 Техподдержка', url: 'https://t.me/feedbckbot' },
          { text: '📊 Cтатистика', callback_data: 'stats' }
        ]]
      }
    }
  );
});

bot.command('stats', async (ctx) => {
  const chatId = ctx.from.id;

  try {
    // Убедимся что пользователь есть в базе
    await supabase
      .from('users')
      .upsert({ 
        chat_id: chatId, 
        username: ctx.from.username || null,
        created_at: new Date().toISOString()
      }, { 
        onConflict: 'chat_id',
        ignoreDuplicates: false
      });

    // Получаем все задачи пользователя
    const { data: tasks } = await supabase
      .from('tasks')
      .select('api_used, status')
      .eq('chat_id', chatId);

    const { data: user } = await supabase
      .from('users')
      .select('created_at')
      .eq('chat_id', chatId)
      .single();

    // Считаем статистику
    const successTasks = tasks?.filter(t => t.status === 'success') || [];
    const totalDownloads = successTasks.length;
    const dyysyCount = tasks?.filter(t => t.api_used === 'dyysy' && t.status === 'success').length || 0;
    const vid7Count = tasks?.filter(t => t.api_used === 'vid7' && t.status === 'success').length || 0;
    const errorCount = tasks?.filter(t => t.status === 'error').length || 0;
    const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : 'Сегодня';

    await ctx.reply(
      `📊 *Ваша статистика:*\n\n` +
      `✅ Всего скачано: *${totalDownloads}*\n` +
      `📹 Основной: ${dyysyCount}\n` +
      `🎬 Резервный: ${vid7Count}\n` +
      `❌ Ошибок: ${errorCount}\n\n` +
      `📅 С нами с: ${memberSince}`,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('Stats error:', error);
    await ctx.reply('❌ Ошибка получения статистики.');
  }
});

bot.command('admin', async (ctx) => {
  const chatId = ctx.from.id;
  
  if (chatId !== ADMIN_ID) {
    return await ctx.reply('❌ У вас нет прав администратора.');
  }
  
  const domain = process.env.WEBHOOK_URL?.replace('/api/webhook', '') || 'your-domain.vercel.app';
  await ctx.reply(
    `🔐 Админ-панель доступна по адресу:\n\n` +
    `${domain}/admin\n\n` +
    `🔑 Пароль: ${process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'sora2025'}`
  );
});

bot.command('support', async (ctx) => {
  await ctx.reply(
    '💬 *Техническая поддержка*\n\n' +
    'Если у вас возникли проблемы с ботом, напишите в @feedbckbot\n\n' +
    '📝 Укажите в сообщении:\n' +
    '• Ссылку на видео, которое не скачалось\n' +
    '• Описание проблемы\n' +
    '• Скриншот ошибки (если есть)\n\n' +
    'Мы постараемся ответить как можно быстрее! 🚀',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '💬 Написать в поддержку', url: 'https://t.me/feedbckbot' }
        ]]
      }
    }
  );
});

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const chatId = ctx.from.id;
  const callbackData = (ctx.callbackQuery as any).data;
  console.log('Received callback_query:', callbackData); // <- Для отладки

  // Обработка кнопки "Статистика"
  if (callbackData === 'stats') {
    await ctx.answerCbQuery(); // <- Сразу отвечаем на callback
    try {            
      const { data: tasks } = await supabase
        .from('tasks')
        .select('api_used, status')
        .eq('chat_id', chatId);

      const { data: user } = await supabase
        .from('users')
        .select('created_at')
        .eq('chat_id', chatId)
        .single();

      // Считаем успешные скачивания
      const successTasks = tasks?.filter(t => t.status === 'success') || [];
      const totalDownloads = successTasks.length;
      
      const dyysyCount = tasks?.filter(t => t.api_used === 'dyysy' && t.status === 'success').length || 0;
      const vid7Count = tasks?.filter(t => t.api_used === 'vid7' && t.status === 'success').length || 0;
      const errorCount = tasks?.filter(t => t.status === 'error').length || 0;
      const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : 'Сегодня';

      await ctx.reply(
        `📊 *Ваша статистика:*\n\n` +
        `✅ Всего скачано: *${totalDownloads}*\n` +
        `📹 Основной: ${dyysyCount}\n` +
        `🎬 Резервный: ${vid7Count}\n` +
        `❌ Ошибок: ${errorCount}\n\n` +
        `📅 С нами с: ${memberSince}`,
        { parse_mode: 'Markdown' }
      );

    } catch (error) {
      console.error('Stats error:', error);
      await ctx.answerCbQuery('Ошибка'); // <- Если ошибка, тоже нужен answerCbQuery
      await ctx.reply('❌ Ошибка получения статистики.');
    }
    
    return; // <- Важно! Выходим из функции
  }

  // Обработка кнопки "Альтернативная версия"
  if (data?.startsWith('retry:')) {
    const videoId = data.split(':')[1];
    const soraUrl = `https://sora.chatgpt.com/p/s_${videoId}`;
    
    await ctx.answerCbQuery('🔄 Загрузка через VID7...');
    
    try {
      const result = await processSoraVid7(soraUrl);
      const fullDescription = extractFullDescription(result.title);
      
      await ctx.replyWithVideo(
        { url: result.videoUrl },
        { caption: `✅ Видео без водяного знака\n🟣 Источник: VID7 API` }
      );

      // Постим в канал
      await postVideoToChannel({
        videoUrl: result.videoUrl,
        username: ctx.from?.username,
        chatId: ctx.from?.id,
        soraUrl: soraUrl,
        apiUsed: 'vid7',
        fullDescription: fullDescription,
        title: result.title
      });
      
    } catch (error: any) {
      await ctx.reply('❌ Ошибка при загрузке через VID7');
    }
  }

  const cooldownResult = await checkButtonCooldown(chatId);
  if (!cooldownResult.allowed) {
    return await ctx.answerCbQuery(cooldownResult.message!, { show_alert: true });
  }

  try {
    const videoId = callbackData.replace('retry:', '');
    const soraUrl = `https://sora.chatgpt.com/p/s_${videoId}`;

    await ctx.answerCbQuery('⏳ Обработка...');
    
    const statusMsg = await ctx.reply('⏳ Скачиваю альтернативную версию...');

    const result = await processSoraVid7(soraUrl);

    // Получаем размер
    let fileSize = 'неизвестно';
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
    
    const { data: task } = await supabase
      .from('tasks')
      .insert({
        chat_id: chatId,
        sora_url: soraUrl,
        api_used: result.apiUsed,
        status: 'success',
        result_url: result.videoUrl,
        title: result.title
      })
      .select('id')
      .single();

    const baseUrl = process.env.WEBHOOK_URL?.replace('/api/webhook', '') || 'https://sora-bot-five.vercel.app';
    const proxyUrl = task ? `${baseUrl}/api/video/${task.id}` : result.videoUrl;

    await ctx.telegram.deleteMessage(chatId, statusMsg.message_id).catch(() => {});

    await ctx.replyWithVideo(
      { url: proxyUrl },
      { 
        caption: `✅ Готово (альтернативная версия)\n📦 Размер: ${fileSize}\n\n⚠️ Если логотип остался,\n напишите в /support` 
      }
    );

    // Постим в канал
    await postVideoToChannel({
      videoUrl: proxyUrl,
      caption: result.title, // <- Было title, стало caption
      chatId: chatId,
      soraUrl: soraUrl,
      apiUsed: result.apiUsed,
      source: 'bot',
      userId: chatId,
      username: ctx.from.username
    });

    await supabase.rpc('increment_success_count', { user_chat_id: chatId });

  } catch (error: any) {
    console.error('Callback error:', error);
    let errorMsg = '❌ Ошибка при скачивании';
    
    if (error.message?.includes('not found')) {
      errorMsg = '❌ Видео не найдено';
    } else if (error.message?.includes('timeout')) {
      errorMsg = '❌ Превышено время ожидания';
    }
    
    await ctx.answerCbQuery(errorMsg, { show_alert: true });
    
    await ctx.reply(
      `${errorMsg}\n\n⚠️ Если проблема повторяется, обратитесь в техподдержку: @feedbckbot`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '💬 Техподдержка', url: 'https://t.me/feedbckbot' }
          ]]
        }
      }
    );
    
    await supabase.from('tasks').insert({
      chat_id: chatId,
      sora_url: `retry:${callbackData}`,
      api_used: 'vid7',
      status: 'error',
      error: error.message || 'Unknown error'
    });
  }
});

bot.on('text', async (ctx) => {
  const chatId = ctx.from!.id;
  const text = ctx.message!.text;

  const rate = await checkRateLimit(chatId);
  if (!rate.allowed) return ctx.reply(rate.message!);

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const soraUrls = lines.filter(line =>
    line.match(/sora\.chatgpt\.com\/(ps|p\/s_)[a-f0-9]{32}/i)
  );

  if (soraUrls.length === 0) {
    return ctx.reply(ERROR_MESSAGES.INVALID_URL);
  }

  if (soraUrls.length > 5) {
    return ctx.reply(
      ERROR_MESSAGES.TOO_MANY_URLS.replace('{count}', soraUrls.length.toString())
    );
  }

  const uniqueUrls = [...new Set(soraUrls)];

  if (uniqueUrls.length === 1) {
    await processUrl(ctx, uniqueUrls[0]);
  } else {
    await ctx.reply(`📦 Обрабатываю ${uniqueUrls.length} ссылок...`);
    
    // Обработка по очереди
    for (let i = 0; i < uniqueUrls.length; i++) {
      try {
        await processUrl(ctx, uniqueUrls[i], i + 1);
      } catch (e) {
        console.error(`Failed to process URL ${i+1}:`, e);
      }
      
      if (i < uniqueUrls.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
});
