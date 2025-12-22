// src/lib/telegram-channel.ts
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.BOT_TOKEN!);
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '';

interface PostToChannelParams {
  videoUrl: string;
  title?: string;
  source: 'website' | 'bot';
  userId?: number;
  username?: string;
}

export async function postVideoToChannel({
  videoUrl,
  title,
  source,
  userId,
  username
}: PostToChannelParams): Promise<void> {
  if (!CHANNEL_ID || CHANNEL_ID === '') {
    console.error('❌ TELEGRAM_CHANNEL_ID not set');
    return;
  }

  console.log('📢 Posting to channel:', CHANNEL_ID);

  try {
    // Формируем краткий caption (только источник)
    let caption = '';
    
    if (source === 'website') {
      caption = '🌐 *Источник:* Сайт';
    } else if (source === 'bot' && userId) {
      const userLink = username 
        ? `[@${username}](tg://user?id=${userId})`
        : `[Пользователь](tg://user?id=${userId})`;
      caption = `👤 *Отправил:* ${userLink}`;
    }

    // Отправляем видео с кратким caption
    const message = await bot.telegram.sendVideo(CHANNEL_ID, videoUrl, {
      caption: caption,
      parse_mode: 'Markdown'
    });

    console.log('✅ Video sent to channel, message_id:', message.message_id);

    // Если есть title и он не пустой
    if (title && title.trim() !== '' && title !== 'Untitled' && title !== 'Sora Video') {
      const cleanTitle = title.trim();
      
      // Telegram позволяет до 4096 символов в обычном сообщении
      // Но оставляем запас для markdown и форматирования
      const maxChunkSize = 3800;
      
      if (cleanTitle.length <= maxChunkSize) {
        // Весь title помещается в одно сообщение
        await bot.telegram.sendMessage(
          CHANNEL_ID,
          `\`\`\`json\n${cleanTitle}\n\`\`\``,
          {
            parse_mode: 'Markdown',
            reply_parameters: { message_id: message.message_id }
          }
        );
      } else {
        // Разбиваем на части
        const chunks = splitTextSmart(cleanTitle, maxChunkSize);
        
        for (let i = 0; i < chunks.length; i++) {
          await bot.telegram.sendMessage(
            CHANNEL_ID,
            `\`\`\`json\n${chunks[i]}\n\`\`\``,
            {
              parse_mode: 'Markdown',
              reply_parameters: { message_id: message.message_id }
            }
          );
          
          // Задержка между сообщениями
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
    }

    console.log('✅ Video posted to channel successfully');
  } catch (error: any) {
    console.error('❌ Failed to post to channel:', error.message);
    // Не бросаем ошибку, чтобы не сломать основной процесс
  }
}

// Умная разбивка текста с сохранением структуры JSON
function splitTextSmart(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  
  // Если текст короче лимита, возвращаем как есть
  if (text.length <= maxLength) {
    return [text];
  }
  
  // Пробуем разбить по строкам
  const lines = text.split('\n');
  let currentChunk = '';
  
  for (const line of lines) {
    // Если текущий чанк + новая строка превышает лимит
    if ((currentChunk + line + '\n').length > maxLength) {
      // Сохраняем текущий чанк если он не пустой
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // Если одна строка длиннее лимита, разбиваем её по словам
      if (line.length > maxLength) {
        const words = line.split(' ');
        let tempChunk = '';
        
        for (const word of words) {
          if ((tempChunk + word + ' ').length > maxLength) {
            if (tempChunk.trim()) {
              chunks.push(tempChunk.trim());
              tempChunk = '';
            }
            // Если одно слово длиннее лимита, режем его
            if (word.length > maxLength) {
              for (let i = 0; i < word.length; i += maxLength) {
                chunks.push(word.slice(i, i + maxLength));
              }
            } else {
              tempChunk = word + ' ';
            }
          } else {
            tempChunk += word + ' ';
          }
        }
        
        if (tempChunk.trim()) {
          currentChunk = tempChunk;
        }
      } else {
        currentChunk = line + '\n';
      }
    } else {
      currentChunk += line + '\n';
    }
  }
  
  // Добавляем последний чанк
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}
