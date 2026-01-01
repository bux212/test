// src/app/api/webhook/commands.ts
console.log('🚀 [INIT] commands.ts is being executed');

import { bot } from '@/lib/bot-instance';
import { processUrl, ERROR_MESSAGES } from '@/lib/bot/handlers';
import { checkRateLimit, checkButtonCooldown } from '@/lib/bot/rate-limit';
import { supabase } from '@/lib/supabase';
import { processSoraVid7 } from '@/lib/sora-api';
import { postVideoToChannel } from '@/lib/telegram-channel';
import { extractFullDescription } from '@/lib/sorapure-downloader';
import { t, getUserLanguage, setUserLanguage, type Language } from '@/lib/i18n';

console.log('🤖 [INIT] Bot instance check:', bot ? 'OK' : 'MISSING');
console.log('👂 [INIT] Registering callback_query handler...');
async function ensureUserExists(chatId: number, username?: string): Promise<Language> {
  // Проверяем, есть ли пользователь
  const { data: existingUser } = await supabase
    .from('users')
    .select('language, chat_id')
    .eq('chat_id', chatId)
    .single();

  if (existingUser) {
    // Пользователь существует
    return (existingUser.language as Language) || 'ru';
  }

  // Новый пользователь - определяем язык по language_code из Telegram
  const defaultLang: Language = 'ru'; // можно использовать ctx.from.language_code === 'ru' ? 'ru' : 'en'

  // Создаём пользователя с языком по умолчанию
  await supabase
    .from('users')
    .insert({
      chat_id: chatId,
      username: username || null,
      language: defaultLang,
      created_at: new Date().toISOString()
    });

  console.log(`✅ Auto-created user ${chatId} with language: ${defaultLang}`);

  return defaultLang;
}

const ADMIN_ID = parseInt(process.env.ADMIN_ID || '0');
// Дедупликация
const processedMessages = new Map<string, number>();

// Очистка старых записей каждые 5 минут
setInterval(() => {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  for (const [key, timestamp] of processedMessages.entries()) {
    if (now - timestamp > fiveMinutes) {
      processedMessages.delete(key);
    }
  }
}, 60 * 1000);

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

bot.command('start', async (ctx) => {
  const chatId = ctx.from.id;
  const username = ctx.from.username || null;

  // Проверяем, есть ли уже язык у пользователя
  const { data: existingUser } = await supabase
    .from('users')
    .select('language, created_at')
    .eq('chat_id', chatId)
    .single();

    const isOldUser = existingUser && 
      new Date(existingUser.created_at) < new Date('2025-12-29'); // дата перехода на нового бота
  
  if (!existingUser || !existingUser.language) {
    // Новый пользователь - показываем выбор языка
    await supabase
      .from('users')
      .upsert({
        chat_id: chatId,
        username: username,
        language: null, // Язык ещё не выбран
        created_at: new Date().toISOString()
      }, { onConflict: 'chat_id' });

    // Показываем уведомление о миграции для старых пользователей
    let welcomeText = '🌐 Please select your language / Пожалуйста, выберите язык:';
    
    if (isOldUser) {
      welcomeText = 
        '🔄 *Бот был обновлён!* / *Bot has been updated!*\n\n' +
        '✨ Новые возможности / New features:\n' +
        '• 🌐 Мультиязычность / Multi-language\n' +
        '• ⚡️ Быстрее и стабильнее / Faster & more stable\n' +
        '• 📊 Улучшенная статистика / Better stats\n\n' +
        '🌐 Выберите язык / Select language:';
    }

    return await ctx.reply(
      '🌐 Please select your language / Пожалуйста, выберите язык:',
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🇺🇸 English', callback_data: 'lang:en' },
              { text: '🇷🇺 Русский', callback_data: 'lang:ru' }
            ]
          ]
        }
      }
    );
  }

 // Язык уже выбран - показываем приветствие
  const lang = (existingUser.language as Language) || 'ru';

  await ctx.reply(
    `${t(lang, 'welcome')}\n\n` +
    `${t(lang, 'howToUse')}\n` +
    `${t(lang, 'step1')}\n` +
    `${t(lang, 'step2')}\n` +
    `${t(lang, 'step3')}\n\n` +
    `${t(lang, 'multipleLinks')}\n\n` +
    `${t(lang, 'limits')}\n\n` +
    `${t(lang, 'questions')} /support`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: t(lang, 'btnSupport'), url: 'https://t.me/feedbckbot' },
            { text: t(lang, 'btnStats'), callback_data: 'stats' }
          ],
          [
            { text: t(lang, 'btnSettings'), callback_data: 'settings' },
            { text: t(lang, 'btnLanguage'), callback_data: 'change_lang' }
          ]
        ]
      }
    }
  );
});

bot.command('language', async (ctx) => {
  await ctx.reply(
    '🌐 Select language / Выберите язык:',
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🇺🇸 English', callback_data: 'lang:en' },
            { text: '🇷🇺 Русский', callback_data: 'lang:ru' }
          ]
        ]
      }
    }
  );
});

bot.command('stats', async (ctx) => {
  const chatId = ctx.from.id;
  const lang = await getUserLanguage(chatId);

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

    const successTasks = tasks?.filter(t => t.status === 'success') || [];
    const totalDownloads = successTasks.length;
    const dyysyCount = tasks?.filter(t => t.api_used === 'dyysy' && t.status === 'success').length || 0;
    const vid7Count = tasks?.filter(t => t.api_used === 'vid7' && t.status === 'success').length || 0;
    const errorCount = tasks?.filter(t => t.status === 'error').length || 0;
    const memberSince = user?.created_at 
      ? new Date(user.created_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US') 
      : (lang === 'ru' ? 'Сегодня' : 'Today');

    await ctx.reply(
      `${t(lang, 'yourStats')}\n\n` +
      `${t(lang, 'totalDownloaded', { count: totalDownloads })}\n` +
      `${t(lang, 'mainApi', { count: dyysyCount })}\n` +
      `${t(lang, 'reserveApi', { count: vid7Count })}\n` +
      `${t(lang, 'errors', { count: errorCount })}\n\n` +
      `${t(lang, 'memberSince', { date: memberSince })}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Stats error:', error);
    await ctx.reply(t(lang, 'errStats'));
  }
});

bot.command('admin', async (ctx) => {
  const chatId = ctx.from.id;
  const lang = await getUserLanguage(chatId);
  
  if (chatId !== ADMIN_ID) {
    return await ctx.reply(t(lang, 'adminNoAccess'));
  }

  try {
    // 1. Общая статистика пользователей
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('chat_id, created_at, language, success_count');

    if (usersError) throw usersError;

    const totalUsers = usersData?.length || 0;
    const rusUsers = usersData?.filter(u => u.language === 'ru').length || 0;
    const enUsers = usersData?.filter(u => u.language === 'en').length || 0;
    const noLangUsers = usersData?.filter(u => !u.language).length || 0;

    // Новые пользователи за последние 24 часа
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const newUsersToday = usersData?.filter(u => u.created_at > oneDayAgo).length || 0;

    // Новые пользователи за последние 7 дней
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const newUsersWeek = usersData?.filter(u => u.created_at > sevenDaysAgo).length || 0;

    // 2. Статистика загрузок
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('api_used, status, created_at');

    if (tasksError) throw tasksError;

    const totalTasks = tasksData?.length || 0;
    const successTasks = tasksData?.filter(t => t.status === 'success').length || 0;
    const errorTasks = tasksData?.filter(t => t.status === 'error').length || 0;
    const dyysyCount = tasksData?.filter(t => t.api_used === 'dyysy' && t.status === 'success').length || 0;
    const vid7Count = tasksData?.filter(t => t.api_used === 'vid7' && t.status === 'success').length || 0;

    // Загрузки за последние 24 часа
    const downloadsToday = tasksData?.filter(t => t.created_at > oneDayAgo && t.status === 'success').length || 0;

    // 3. Статистика веб-загрузок
    const { data: webDownloads, error: webError } = await supabase
      .from('web_downloads')
      .select('created_at');

    const totalWebDownloads = webDownloads?.length || 0;
    const webDownloadsToday = webDownloads?.filter(w => w.created_at > oneDayAgo).length || 0;

    // 4. Статистика рассылок
    const { data: broadcasts, error: broadcastError } = await supabase
      .from('broadcasts')
      .select('sent_count, failed_count, created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    const lastBroadcast = broadcasts?.[0];
    const lastBroadcastDate = lastBroadcast?.created_at 
      ? new Date(lastBroadcast.created_at).toLocaleString('ru-RU')
      : 'Нет данных';

    // 5. Топ активных пользователей
    const topUsers = usersData
      ?.sort((a, b) => (b.success_count || 0) - (a.success_count || 0))
      .slice(0, 5) || [];

    // Формируем сообщение
    const domain = process.env.WEBHOOK_URL?.replace('/api/webhook', '') || 'your-domain.vercel.app';
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'sora2025';

    const statsMessage = 
      `🔐 *АДМИН-ПАНЕЛЬ*\n\n` +
      
      `👥 *ПОЛЬЗОВАТЕЛИ*\n` +
      `├ Всего: *${totalUsers}*\n` +
      `├ 🇷🇺 Русский: ${rusUsers}\n` +
      `├ 🇺🇸 English: ${enUsers}\n` +
      `├ ⚪️ Без языка: ${noLangUsers}\n` +
      `├ 📈 Новых за 24ч: ${newUsersToday}\n` +
      `└ 📊 Новых за 7д: ${newUsersWeek}\n\n` +
      
      `📥 *ЗАГРУЗКИ (БОТ)*\n` +
      `├ Всего: *${totalTasks}*\n` +
      `├ ✅ Успешно: ${successTasks}\n` +
      `├ ❌ Ошибок: ${errorTasks}\n` +
      `├ 🔵 DYYSY API: ${dyysyCount}\n` +
      `├ 🟣 VID7 API: ${vid7Count}\n` +
      `└ 📈 За 24ч: ${downloadsToday}\n\n` +
      
      `🌐 *ЗАГРУЗКИ (ВЕБ)*\n` +
      `├ Всего: *${totalWebDownloads}*\n` +
      `└ 📈 За 24ч: ${webDownloadsToday}\n\n` +
      
      `📢 *РАССЫЛКИ*\n` +
      `├ Последняя: ${lastBroadcastDate}\n` +
      `├ ✅ Отправлено: ${lastBroadcast?.sent_count || 0}\n` +
      `└ ❌ Ошибок: ${lastBroadcast?.failed_count || 0}\n\n` +
      
      `🏆 *ТОП-5 АКТИВНЫХ*\n` +
      topUsers.map((u, i) => 
        `${i + 1}. ID ${u.chat_id}: ${u.success_count || 0} загрузок`
      ).join('\n') + '\n\n' +
      
      `🔗 *ССЫЛКИ*\n` +
      `Панель: ${domain}/admin\n` +
      `Пароль: \`${adminPassword}\`\n\n` +
      
      `📋 *КОМАНДЫ*\n` +
      `• \`/broadcast <текст>\` - Рассылка\n` +
      `• \`/stats\` - Моя статистика\n` +
      `• \`/admin\` - Эта панель`;

    await ctx.reply(statsMessage, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🌐 Открыть админ-панель', url: `${domain}/admin` }
          ],
          [
            { text: '🔄 Обновить статистику', callback_data: 'admin_refresh' }
          ]
        ]
      }
    });

  } catch (error: any) {
    console.error('Admin stats error:', error);
    await ctx.reply(
      '❌ Ошибка получения статистики\n\n' +
      `Детали: ${error.message}`
    );
  }
});


bot.command('support', async (ctx) => {
  const lang = await getUserLanguage(ctx.from.id);
  
  await ctx.reply(
    `${t(lang, 'supportTitle')}\n\n` +
    `${t(lang, 'supportText')}\n\n` +
    `${t(lang, 'supportInclude')}\n` +
    `${t(lang, 'supportLink')}\n` +
    `${t(lang, 'supportProblem')}\n` +
    `${t(lang, 'supportScreenshot')}\n\n` +
    `${t(lang, 'supportFast')}`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: t(lang, 'btnContactSupport'), url: 'https://t.me/feedbckbot' }
        ]]
      }
    }
  );
});

// 🆕 КОМАНДА ДЛЯ РАССЫЛКИ (только для админа)
bot.command('broadcast', async (ctx) => {
  const chatId = ctx.from.id;
  
  if (chatId !== ADMIN_ID) {
    return await ctx.reply('❌ Access denied');
  }

  const text = ctx.message.text.replace('/broadcast', '').trim();
  
  if (!text) {
    return await ctx.reply(
      '📢 *Как использовать рассылку:*\n\n' +
      '`/broadcast Текст сообщения`\n\n' +
      'Сообщение будет отправлено всем пользователям бота.',
      { parse_mode: 'Markdown' }
    );
  }

  await ctx.reply('🔄 Начинаю рассылку...');

  try {
    // Получаем всех пользователей
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('chat_id');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return await ctx.reply('❌ Ошибка получения списка пользователей');
    }

    if (!users || users.length === 0) {
      return await ctx.reply('❌ Нет пользователей для рассылки');
    }

    let sent = 0;
    let failed = 0;

    // Отправляем сообщения всем пользователям
    for (const user of users) {
      try {
        await bot.telegram.sendMessage(user.chat_id, text, { parse_mode: 'Markdown' });
        sent++;
      } catch (error: any) {
        failed++;
        console.error(`Failed to send to ${user.chat_id}:`, error.message);
      }
      
      // Задержка для соблюдения лимитов Telegram (30 сообщений/сек)
      await new Promise(r => setTimeout(r, 35));
    }

    // Сохраняем статистику рассылки (опционально)
    try {
      await supabase
        .from('broadcasts')
        .insert({
          message_text: text,
          sent_count: sent,
          failed_count: failed,
          status: 'completed',
          completed_at: new Date().toISOString()
        });
    } catch (dbError) {
      console.error('Error saving broadcast stats:', dbError);
      // Продолжаем, даже если не удалось сохранить статистику
    }

    await ctx.reply(
      `✅ Рассылка завершена!\n\n` +
      `📤 Отправлено: ${sent}\n` +
      `❌ Не доставлено: ${failed}\n` +
      `👥 Всего пользователей: ${users.length}`
    );

  } catch (error: any) {
    console.error('Broadcast error:', error);
    await ctx.reply('❌ Ошибка при рассылке: ' + error.message);
  }
});


// Регистрация обработчика callback_query
bot.on('callback_query', async (ctx) => {
  console.log('🔔 [CALLBACK] ========== EVENT FIRED ==========');
  
  try {
    const callbackData = (ctx.callbackQuery as any).data;
    const chatId = ctx.from.id;
    
    console.log('📞 [CALLBACK] Data:', callbackData);
    console.log('👤 [CALLBACK] User ID:', chatId);

    // КРИТИЧНО: Сразу подтверждаем получение callback
    await ctx.answerCbQuery();
    console.log('✅ [CALLBACK] answerCbQuery sent');

    // 1. Обработка выбора языка
    if (callbackData?.startsWith('lang:')) {
      console.log('🌐 [CALLBACK] Language selection detected');
      const lang = callbackData.split(':')[1] as Language;
      await setUserLanguage(chatId, lang);
      
      await ctx.reply(
        `${t(lang, 'welcome')}\n\n` +
        `${t(lang, 'howToUse')}\n` +
        `${t(lang, 'step1')}\n` +
        `${t(lang, 'step2')}\n` +
        `${t(lang, 'step3')}\n\n` +
        `${t(lang, 'multipleLinks')}\n\n` +
        `${t(lang, 'limits')}\n\n` +
        `${t(lang, 'questions')} /support`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: t(lang, 'btnSupport'), url: 'https://t.me/feedbckbot' },
                { text: t(lang, 'btnStats'), callback_data: 'stats' }
              ],
              [
                { text: t(lang, 'btnLanguage'), callback_data: 'change_lang' }
              ]
            ]
          }
        }
      );
      console.log('✅ [CALLBACK] Language changed to:', lang);
      return;
    }

    // 2. Обработка кнопки смены языка
    if (callbackData === 'change_lang') {
      console.log('🔄 [CALLBACK] Change language button pressed');
      await ctx.reply(
        '🌐 Select language / Выберите язык:',
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🇺🇸 English', callback_data: 'lang:en' },
                { text: '🇷🇺 Русский', callback_data: 'lang:ru' }
              ]
            ]
          }
        }
      );
      console.log('✅ [CALLBACK] Language menu sent');
      return;
    }

    const lang = await getUserLanguage(chatId);

    // 3. Обработка кнопки "Статистика"
    if (callbackData === 'stats') {
      console.log('📊 [CALLBACK] Stats button pressed');
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

        const successTasks = tasks?.filter(t => t.status === 'success') || [];
        const totalDownloads = successTasks.length;
        const dyysyCount = tasks?.filter(t => t.api_used === 'dyysy' && t.status === 'success').length || 0;
        const vid7Count = tasks?.filter(t => t.api_used === 'vid7' && t.status === 'success').length || 0;
        const errorCount = tasks?.filter(t => t.status === 'error').length || 0;

        const memberSince = user?.created_at
          ? new Date(user.created_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US')
          : (lang === 'ru' ? 'Сегодня' : 'Today');

        await ctx.reply(
          `${t(lang, 'yourStats')}\n\n` +
          `${t(lang, 'totalDownloaded', { count: totalDownloads })}\n` +
          `${t(lang, 'mainApi', { count: dyysyCount })}\n` +
          `${t(lang, 'reserveApi', { count: vid7Count })}\n` +
          `${t(lang, 'errors', { count: errorCount })}\n\n` +
          `${t(lang, 'memberSince', { date: memberSince })}`,
          { parse_mode: 'Markdown' }
        );
        console.log('✅ [CALLBACK] Stats sent successfully');
      } catch (error) {
        console.error('❌ [CALLBACK] Stats error:', error);
        await ctx.reply(t(lang, 'errStats'));
      }
      return;
    }

    // 4. Обработка кнопки "Альтернативная версия" (retry:)
    if (callbackData?.startsWith('retry:')) {
      console.log('🔄 [CALLBACK] Retry button pressed');
      
      const cooldownResult = await checkButtonCooldown(chatId);
      if (!cooldownResult.allowed) {
        console.log('⏱️ [CALLBACK] Cooldown active, rejecting');
        await ctx.answerCbQuery(cooldownResult.message!, { show_alert: true });
        return;
      }

      const videoId = callbackData.split(':')[1];
      const soraUrl = `https://sora.chatgpt.com/p/s_${videoId}`;
      console.log('📥 [CALLBACK] Downloading video:', videoId);

      const statusMsg = await ctx.reply(t(lang, 'downloading'));

      try {
        const result = await processSoraVid7(soraUrl);
        const fullDescription = extractFullDescription(result.title);

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
            caption: `${t(lang, 'doneAlt')}\n${t(lang, 'fileSize', { size: fileSize })}\n\n${t(lang, 'watermarkWarning')}`
          }
        );

        await postVideoToChannel({
          videoUrl: proxyUrl,
          fileSize: fileSize,
          username: ctx.from?.username,
          chatId: chatId,
          soraUrl: soraUrl,
          apiUsed: 'vid7',
          fullDescription: fullDescription,
          title: result.title
        });

        await supabase.rpc('increment_success_count', { user_chat_id: chatId });
        console.log('✅ [CALLBACK] Video sent successfully');

      } catch (error: any) {
        console.error('❌ [CALLBACK] Retry error:', error);
        
        let errorMsg = t(lang, 'errGeneric');
        if (error.message?.includes('not found')) {
          errorMsg = t(lang, 'errVideoNotFound');
        } else if (error.message?.includes('timeout')) {
          errorMsg = t(lang, 'errTimeout');
        }

        await ctx.reply(
          `${errorMsg}\n\n${t(lang, 'errPersists')}`,
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
          sora_url: soraUrl,
          api_used: 'vid7',
          status: 'error',
          error: error.message || 'Unknown error'
        });
      }
      return;
    }

    // 5. Неизвестный callback
    console.log('⚠️ [CALLBACK] Unknown callback_data:', callbackData);
    
  } catch (error: any) {
    console.error('❌ [CALLBACK] Handler error:', error);
  }
});

console.log('✅ [INIT] callback_query handler registered');



bot.on('text', async (ctx) => {
  const chatId = ctx.from!.id;
  const text = ctx.message!.text;

  console.log('📝 [TEXT] Received text message:', text);
  
  // Игнорируем команды и ссылки Sora
  if (text.startsWith('/') || text.match(/sora\.chatgpt\.com/i)) {
    const lang = await ensureUserExists(chatId, ctx.from!.username);
    
  const rate = await checkRateLimit(chatId);
  if (!rate.allowed) return ctx.reply(t(lang, 'errRateLimit'));

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const soraUrls = lines.filter(line =>
    line.match(/sora\.chatgpt\.com\/(ps|p\/s_)[a-f0-9]{32}/i)
  );

  if (soraUrls.length === 0) {
    return ctx.reply(t(lang, 'errInvalidUrl'));
  }

  if (soraUrls.length > 5) {
    return ctx.reply(t(lang, 'errTooManyUrls', { count: soraUrls.length.toString() }));
  }

  const uniqueUrls = [...new Set(soraUrls)];
  const messageId = ctx.message!.message_id;
  const cacheKey = `${chatId}:${messageId}`;
  
  const isProcessed = processedMessages.get(cacheKey);
  if (isProcessed) {
    console.log(`⚠️ Message ${messageId} already processed, skipping`);
    return;
  }
  
  processedMessages.set(cacheKey, Date.now());

  if (uniqueUrls.length === 1) {
    await processUrl(ctx, uniqueUrls[0]);
  } else {
    await ctx.reply(t(lang, 'processingMultiple', { count: uniqueUrls.length.toString() }));

    for (let i = 0; i < uniqueUrls.length; i++) {
      try {
        await processUrl(ctx, uniqueUrls[i], i + 1, uniqueUrls.length);
      } catch (e) {
        console.error(`Failed to process URL ${i+1}:`, e);
      }
      
      if (i < uniqueUrls.length - 1) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
});