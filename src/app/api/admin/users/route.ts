// src/app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Admin API: Loading users...');
    
    const { data: users, error } = await supabase
      .from('users')
      .select('chat_id, username, success_count, created_at')
      .order('success_count', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ 
        error: error.message
      }, { status: 500 });
    }

    console.log(`Loaded ${users?.length || 0} users`);
    
    return NextResponse.json({ 
      users: users || [],
      count: users?.length || 0
    });

  } catch (error: any) {
    console.error('API exception:', error);
    return NextResponse.json({ 
      error: error.message
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
