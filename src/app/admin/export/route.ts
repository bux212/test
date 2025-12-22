// src/app/api/admin/export/route.ts
import { supabase } from '@/lib/supabase';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const password = request.nextUrl.searchParams.get('password');
  
  if (password !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    const csv = [
      'ID,Chat ID,URL,API,Status,Error,Created At',
      ...tasks!.map(t => 
        `${t.id},${t.chat_id},${t.sora_url},${t.api_used},${t.status},${t.error || ''},${t.created_at}`
      )
    ].join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=tasks-export.csv'
      }
    });
  } catch (error) {
    return new Response('Error', { status: 500 });
  }
}
