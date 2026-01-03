import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Логируем что загружено
console.log('🔍 Environment check:');
console.log('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');

if (!supabaseServiceKey) {
  console.error('❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not defined!');
  console.error('   Using ANON_KEY as fallback (RLS policies will block writes!)');
}

// Используем service_role если есть, иначе anon (для совместимости)
const keyToUse = supabaseServiceKey || supabaseAnonKey;

console.log('🔑 Using key type:', 
  supabaseServiceKey ? 'SERVICE_ROLE ✅' : 'ANON_KEY ⚠️ (writes will fail!)'
);
console.log('🔑 Key length:', keyToUse?.length);
console.log('🔑 Key starts with:', keyToUse?.substring(0, 30) + '...');

export const supabase = createClient(supabaseUrl, keyToUse, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
