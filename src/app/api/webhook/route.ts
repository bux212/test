// src/app/api/webhook/route.ts
import { Telegraf } from 'telegraf';
import { processUrl, ERROR_MESSAGES } from '@/lib/bot/handlers';
import { checkRateLimit, checkButtonCooldown } from '@/lib/bot/rate-limit';
import { supabase } from '@/lib/supabase';
import { processSoraVid7 } from '@/lib/sora-api';

const bot = new Telegraf(process.env.BOT_TOKEN!);
const ADMIN_ID = parseInt(process.env.ADMIN_ID || '0');

// /start, /stats, /admin — можно тоже вынести в отдельный файл handlers, но это не обязательно

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

  if (soraUrls.length === 1) {
    await processUrl(ctx, soraUrls[0]);
  } else {
    await ctx.reply(`📦 Обрабатываю ${soraUrls.length} ссылок...`);
    for (let i = 0; i < soraUrls.length; i++) {
      await processUrl(ctx, soraUrls[i], i + 1);
      if (i < soraUrls.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
});

// callback_query тоже можно вынести в handlers

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await bot.handleUpdate(body);
    return new Response('OK', { status: 200 });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('Error', { status: 500 });
  }
}
