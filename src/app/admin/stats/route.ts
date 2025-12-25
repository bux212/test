// src/app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'sora2025';

export async function GET(request: NextRequest) {
  // Проверка пароля
  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Пользователи
    const { data: users } = await supabase
      .from('users')
      .select('chat_id, username, created_at, language, success_count')
      .order('created_at', { ascending: false });

    // 2. Задачи
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, chat_id, sora_url, api_used, status, created_at, error')
      .order('created_at', { ascending: false })
      .limit(1000);

    // 3. Веб-загрузки
    const { data: webDownloads } = await supabase
      .from('web_downloads')
      .select('id, sora_url, api_used, created_at, ip_address')
      .order('created_at', { ascending: false })
      .limit(1000);

    // 4. Рассылки
    const { data: broadcasts } = await supabase
      .from('broadcasts')
      .select('id, message_text, sent_count, failed_count, status, created_at, completed_at')
      .order('created_at', { ascending: false });

    // Агрегированная статистика
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Статистика по дням за последние 30 дней
    const dailyStats = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const newUsers = users?.filter(u => {
        const created = new Date(u.created_at);
        return created >= date && created < new Date(nextDate);
      }).length || 0;

      const downloads = tasks?.filter(t => {
        const created = new Date(t.created_at);
        return t.status === 'success' && created >= date && created < new Date(nextDate);
      }).length || 0;

      const errors = tasks?.filter(t => {
        const created = new Date(t.created_at);
        return t.status === 'error' && created >= date && created < new Date(nextDate);
      }).length || 0;

      dailyStats.push({
        date: dateStr,
        newUsers,
        downloads,
        errors
      });
    }

    // Общая статистика
    const stats = {
      users: {
        total: users?.length || 0,
        new24h: users?.filter(u => new Date(u.created_at) > oneDayAgo).length || 0,
        new7d: users?.filter(u => new Date(u.created_at) > sevenDaysAgo).length || 0,
        new30d: users?.filter(u => new Date(u.created_at) > thirtyDaysAgo).length || 0,
        byLanguage: {
          ru: users?.filter(u => u.language === 'ru').length || 0,
          en: users?.filter(u => u.language === 'en').length || 0,
          none: users?.filter(u => !u.language).length || 0
        }
      },
      downloads: {
        total: tasks?.filter(t => t.status === 'success').length || 0,
        today: tasks?.filter(t => t.status === 'success' && new Date(t.created_at) > oneDayAgo).length || 0,
        week: tasks?.filter(t => t.status === 'success' && new Date(t.created_at) > sevenDaysAgo).length || 0,
        byApi: {
          dyysy: tasks?.filter(t => t.api_used === 'dyysy' && t.status === 'success').length || 0,
          vid7: tasks?.filter(t => t.api_used === 'vid7' && t.status === 'success').length || 0
        },
        errors: tasks?.filter(t => t.status === 'error').length || 0
      },
      web: {
        total: webDownloads?.length || 0,
        today: webDownloads?.filter(w => new Date(w.created_at) > oneDayAgo).length || 0,
        week: webDownloads?.filter(w => new Date(w.created_at) > sevenDaysAgo).length || 0
      },
      broadcasts: {
        total: broadcasts?.length || 0,
        lastSent: broadcasts?.[0]?.sent_count || 0,
        lastFailed: broadcasts?.[0]?.failed_count || 0,
        lastDate: broadcasts?.[0]?.created_at || null
      },
      dailyStats
    };

    return NextResponse.json({
      stats,
      users: users?.slice(0, 100), // Последние 100 пользователей
      tasks: tasks?.slice(0, 100), // Последние 100 задач
      broadcasts: broadcasts || []
    });

  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
