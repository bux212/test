// src/lib/telegram-channel.ts
import { bot } from '@/lib//bot-instance';

const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '';
const BOT_DISABLED = process.env.BOT_DISABLED === 'true';

interface PostToChannelParams {
  videoUrl: string;
  caption?: string;
  chatId: number;
  soraUrl: string;
  apiUsed: string;
  source?: string;     // <- Добавь эти 3 строки
  userId?: number;
  username?: string;
}

export async function postVideoToChannel({
  videoUrl,
  caption = '',
  chatId,
  soraUrl,
  apiUsed,
  source = 'unknown',    // <- Добавь значения по умолчанию
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
    
    if (chatMember.status !== 'administrator' && chatMember.status !== 'creator') {
      console.error('❌ Bot is not admin in channel, cannot post');
      return; // НЕ бросаем ошибку, просто выходим
    }

    // Пытаемся отправить видео
    const message = await bot.telegram.sendVideo(parseInt(CHANNEL_ID), videoUrl, {
        caption: caption || `✅ Готово\n📎 Источник: ${source}\n👤 Пользователь: @${username || 'anonymous'}\n🔧 API: ${apiUsed}`,
        parse_mode: 'HTML'
    });

    console.log('✅ Video sent to channel, message_id:', message.message_id);

  } catch (error: any) {
    console.error('❌ Failed to post to channel:', error.message);
    
    // Если ошибка прав - логируем и выходим БЕЗ повтора
    if (error.message?.includes('administrator rights') || 
        error.message?.includes('not enough rights')) {
      console.error('⚠️ Bot lacks admin rights, disabling channel posts');
      return;
    }
    
    // Для остальных ошибок тоже не повторяем
    console.error('⚠️ Channel post failed, skipping');
  }
}
