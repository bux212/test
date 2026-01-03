// ✅ Загружаем .env.local перед импортами
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { bot } from '@/lib/bot-instance'
import { supabase } from '@/lib/supabase'

async function updateUsernames() {
  console.log('🔄 Updating usernames...')
  
  const { data: users } = await supabase
    .from('users')
    .select('chat_id, username')
    .is('username', null)
  
  if (!users || users.length === 0) {
    console.log('✅ All users have usernames')
    return
  }
  
  console.log(`📋 Found ${users.length} users without username`)
  
  for (const user of users) {
    try {
      const chatInfo = await bot.telegram.getChat(user.chat_id)
      
      if ('username' in chatInfo && chatInfo.username) {
        await supabase
          .from('users')
          .update({ username: chatInfo.username })
          .eq('chat_id', user.chat_id)
        
        console.log(`✅ Updated ${user.chat_id} → @${chatInfo.username}`)
      } else {
        console.log(`⚠️ User ${user.chat_id} has no username`)
      }
      
      // Задержка, чтобы не превысить лимит Telegram API (30 req/sec)
      await new Promise(r => setTimeout(r, 100))
    } catch (error) {
      console.error(`❌ Failed to get info for ${user.chat_id}:`, error)
    }
  }
  
  console.log('✅ Done!')
}

updateUsernames()
