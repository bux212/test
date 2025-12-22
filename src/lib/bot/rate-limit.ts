// src/lib/bot/rate-limit.ts
import { supabase } from '@/lib/supabase';
import { ERROR_MESSAGES } from './handlers';

const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW = 60 * 1000;
const BUTTON_COOLDOWN = 10 * 1000;

export async function checkRateLimit(chatId: number) {
  const { data } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('chat_id', chatId)
    .single();

  const now = Date.now();

  if (!data) {
    await supabase.from('rate_limits').insert({
      chat_id: chatId,
      last_request: new Date(now).toISOString(),
      request_count: 1
    });
    return { allowed: true };
  }

  const lastRequest = new Date(data.last_request).getTime();
  const diff = now - lastRequest;

  if (diff > RATE_LIMIT_WINDOW) {
    await supabase
      .from('rate_limits')
      .update({
        last_request: new Date(now).toISOString(),
        request_count: 1
      })
      .eq('chat_id', chatId);
    return { allowed: true };
  }

  if (data.request_count >= RATE_LIMIT_REQUESTS) {
    const wait = Math.ceil((RATE_LIMIT_WINDOW - diff) / 1000);
    return {
      allowed: false,
      message: `${ERROR_MESSAGES.RATE_LIMIT} (осталось ${wait}с)`
    };
  }

  await supabase
    .from('rate_limits')
    .update({
      last_request: new Date(now).toISOString(),
      request_count: data.request_count + 1
    })
    .eq('chat_id', chatId);

  return { allowed: true };
}

export async function checkButtonCooldown(chatId: number) {
  const { data } = await supabase
    .from('rate_limits')
    .select('last_button_click')
    .eq('chat_id', chatId)
    .single();

  if (!data?.last_button_click) return { allowed: true };

  const now = Date.now();
  const last = new Date(data.last_button_click).getTime();
  const diff = now - last;

  if (diff < BUTTON_COOLDOWN) {
    const wait = Math.ceil((BUTTON_COOLDOWN - diff) / 1000);
    return {
      allowed: false,
      message: `${ERROR_MESSAGES.BUTTON_COOLDOWN} (${wait}с)`
    };
  }

  return { allowed: true };
}
