// src/lib/telegram-channel.ts
import { bot } from '@/lib/bot-instance';

const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '-1001104374505';
const BOT_DISABLED = process.env.BOT_DISABLED === 'true';

interface PostToChannelParams {
  videoUrl: string;
  caption?: string;
  chatId: number;
  soraUrl: string;
  apiUsed: string;
  source?: string;
  userId?: number;
  username?: string;
}

export async function postVideoToChannel({
  videoUrl,
  caption = '',
  chatId,
  soraUrl,
  apiUsed,
  source = 'unknown',
  userId,
  username
}: PostToChannelParams): Promise<void> {
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

    // Логируем права для отладки (но не блокируем отправку)
    if (chatMember.status === 'administrator') {
      console.log(`📝 Can post messages flag: ${chatMember.can_post_messages}`);
    }

    // Формируем caption
    const finalCaption = caption || 
      `✅ Готово\n📎 Источник: ${source}\n👤 Пользователь: @${username || 'anonymous'}\n🔧 API: ${apiUsed}`;

    // Пытаемся отправить видео (без дополнительных проверок)
    const message = await bot.telegram.sendVideo(parseInt(CHANNEL_ID), videoUrl, {
      caption: finalCaption,
      parse_mode: 'HTML'
    });

    console.log('✅ Video sent to channel, message_id:', message.message_id);

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