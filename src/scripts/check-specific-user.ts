import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { bot } from '@/lib/bot-instance'
import { supabase } from '@/lib/supabase'

async function checkSpecificUser() {
  const chatId = 8173201676
  
  try {
    // Получаем из БД
    const { data: dbUser } = await supabase
      .from('users')
      .select('username')
      .eq('chat_id', chatId)
      .single()
    
    console.log('📊 DB username:', dbUser?.username || 'NULL')
    
    // Получаем из Telegram
    const chatInfo = await bot.telegram.getChat(chatId)
    
    if ('username' in chatInfo) {
      console.log('📱 Telegram username:', chatInfo.username || 'NONE')
      
      if (chatInfo.username && chatInfo.username !== dbUser?.username) {
        console.log('🔄 Updating in DB...')
        
        await supabase
          .from('users')
          .update({ username: chatInfo.username })
          .eq('chat_id', chatId)
        
        console.log('✅ Updated!')
      }
    }
    
    console.log('\n📋 Full user info:', chatInfo)
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
  
  process.exit(0)
}

checkSpecificUser()
