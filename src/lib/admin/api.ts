// src/lib/admin/api.ts
import { supabase } from '@/lib/supabase';

export async function fetchStats() {
  const { data: users } = await supabase.from('users').select('*');
  const { data: tasks } = await supabase.from('tasks').select('*');
  const { data: webDownloads } = await supabase.from('web_downloads').select('*');
  const { data: buttonClicks } = await supabase.from('button_clicks').select('*');
  // здесь собираете объект Stats как раньше
  return { /* ... */ };
}

export async function fetchTopUsers() {
  const res = await fetch('/api/admin/users');
  return res.json();
}

// и т.д. для остальных запросов
