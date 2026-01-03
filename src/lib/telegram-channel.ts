// src/lib/telegram-channel.ts
import { bot } from '@/lib/bot-instance';

const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '-1001104374505';
const BOT_DISABLED = process.env.BOT_DISABLED === 'true';

interface PostToChannelParams {
  videoUrl: string;
  fileSize?: string;
  chatId?: number;
  soraUrl: string;
  apiUsed: 'dyysy' | 'vid7' | 'web';
  userId?: number;
  username?: string;
  fullDescription?: string;
  title?: string;
}

async function getUsernameLink(chatId?: number, username?: string): Promise<string> {
  if (!chatId || chatId === 0) {
    return '🌐 Website User';
  }

  try {
    // Получаем информацию о пользователе через Telegram API
    const userInfo = await bot.telegram.getChat(chatId);
    
    // Проверяем, есть ли у пользователя username
    if ('username' in userInfo && userInfo.username) {
      const realUsername = userInfo.username;
      // Используем MarkdownV2 синтаксис для создания кликабельной ссылки
      return `[${realUsername}](https://t.me/${realUsername})`;
    }
    
    // Если username нет, используем имя и фамилию с ссылкой на профиль
    let displayName = '';
    if ('first_name' in userInfo) {
      displayName = userInfo.first_name;
      if ('last_name' in userInfo && userInfo.last_name) {
        displayName += ` ${userInfo.last_name}`;
      }
    }
    
    if (displayName) {
      // Ссылка на профиль по chat_id (всегда работает)
      return `[${displayName}](tg://user?id=${chatId})`;
    }
    
    // Fallback - просто ID
    return `User ID: ${chatId}`;
    
  } catch (error) {
    console.error('Error getting user info:', error);
    
    // Если не удалось получить инфо, используем username из параметров
    if (username) {
      return `[${username}](https://t.me/${username})`;
    }
    
    return `User ID: ${chatId}`;
  }
}

function formatCaption(data: PostToChannelParams, userLink: string): string {
  const { fileSize, apiUsed, fullDescription } = data;
  
  // Определяем источник
  let sourceEmoji = '';
  let sourceName = '';
  
  if (apiUsed === 'dyysy') {
    sourceEmoji = '🔵';
    sourceName = 'DYYSY API';
  } else if (apiUsed === 'vid7') {
    sourceEmoji = '🟣';
    sourceName = 'VID7 API';
  } else if (apiUsed === 'web') {
    sourceEmoji = '🌐';
    sourceName = 'Website';
  }
  
  // Формируем caption
  let caption = '';
  
  // Пользователь с кликабельной ссылкой
  caption += `👤: ${userLink}\n`;
  
  // Размер файла
  if (fileSize) {
    caption += `📦 Размер: ${fileSize}\n`;
  }
  
  // Источник
  caption += `${sourceEmoji} Источник: ${sourceName}\n`;
  
  // Описание (если меньше 900 символов)
  if (fullDescription && fullDescription.length <= 900) {
    caption += `\n🎬 Описание:\n\`\`\`\n${fullDescription}\n\`\`\``;
  }
  
  return caption;
}

export async function postVideoToChannel(params: PostToChannelParams): Promise<void> {
  // Проверка: выключен ли бот
  if (BOT_DISABLED) {
    console.log('⚠️ BOT_DISABLED=true, skipping channel post');
    return;
  }

  // Проверка: настроен ли канал
  if (!CHANNEL_ID || CHANNEL_ID === '') {
    console.log('⚠️ TELEGRAM_CHANNEL_ID not set, skipping channel post');
    return;
  }

  console.log('📢 Attempting to post to channel:', CHANNEL_ID);

  try {
    // Проверяем права бота в канале
    const botInfo = await bot.telegram.getMe();
    const chatMember = await bot.telegram.getChatMember(parseInt(CHANNEL_ID), botInfo.id);
    console.log(`👤 Bot status: ${chatMember.status}`);

    // Простая проверка: только статус администратора
    if (chatMember.status !== 'administrator' && chatMember.status !== 'creator') {
      console.error('❌ Bot is not admin in channel, cannot post');
      return;
    }

    // Логируем права для отладки
    if (chatMember.status === 'administrator') {
      console.log(`📝 Can post messages flag: ${chatMember.can_post_messages}`);
    }

    // Получаем правильную ссылку на пользователя
    const userLink = await getUsernameLink(params.chatId, params.username);
    const caption = formatCaption(params, userLink);
    const { fullDescription } = params;

    // ✅ КРИТИЧНО: Добавляем проверку URL
    console.log('📤 Channel video URL:', params.videoUrl);
    
    // Проверяем, что это прокси URL
    if (!params.videoUrl.includes('/api/video/')) {
      console.warn('⚠️ WARNING: Not a proxy URL! URL:', params.videoUrl);
      console.warn('⚠️ This may cause "failed to get HTTP URL content" error');
    }

    // Отправляем видео с caption (используем Markdown для корректного отображения ссылок)
    const message = await bot.telegram.sendVideo(parseInt(CHANNEL_ID), params.videoUrl, {
      caption,
      parse_mode: 'Markdown'
    });

    console.log('✅ Video sent to channel, message_id:', message.message_id);

    // Если описание больше 900 символов, отправляем вторым сообщением
    if (fullDescription && fullDescription.length > 900) {
      await bot.telegram.sendMessage(
        parseInt(CHANNEL_ID),
        `🎬 Полное описание:\n\`\`\`\n${fullDescription}\n\`\`\``,
        {
          parse_mode: 'Markdown',
          reply_parameters: { message_id: message.message_id }
        }
      );
      console.log('✅ Posted full description as reply');
    }

  } catch (error: any) {
    console.error('❌ Failed to post to channel:', error.message);
    
    // Если ошибка прав - логируем подробности
    if (error.message?.includes('administrator rights') ||
        error.message?.includes('not enough rights') ||
        error.message?.includes('need administrator rights')) {
      console.error('⚠️ Bot lacks required admin rights in channel');
      console.error('💡 Solution: Check bot has "Post Messages" permission in channel settings');
      return;
    }

    // Для остальных ошибок логируем и продолжаем
    console.error('⚠️ Channel post failed, reason:', error);
  }
}
