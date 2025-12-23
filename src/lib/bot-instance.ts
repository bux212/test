// src/lib/bot-instance.ts
import { Telegraf } from 'telegraf';

const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN or TELEGRAM_BOT_TOKEN is required');
}

export const bot = new Telegraf(BOT_TOKEN);
