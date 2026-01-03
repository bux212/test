import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { bot } from '@/lib/bot-instance'
import { supabase } from '@/lib/supabase'

async function forceUpdateUsernames() {
  console.log('🔄 Force updating ALL usernames...')
  
  // ✅ Получаем ВСЕХ пользователей (не только с NULL username)
  const { data: users } = await supabase
    .from('users')
    .select('chat_id, username')
  
  if (!users || users.length === 0) {
    console.log('⚠️ No users found')
    process.exit(0)
  }
  
  console.log(`📋 Found ${users.length} users. Checking all...`)
  
  let updated = 0
  let noChange = 0
  let failed = 0
  
  for (const user of users) {
    try {
      const chatInfo = await bot.telegram.getChat(user.chat_id)
      
      if ('username' in chatInfo && chatInfo.username) {
        // Обновляем только если изменился
        if (chatInfo.username !== user.username) {
          await supabase
            .from('users')
            .update({ username: chatInfo.username })
            .eq('chat_id', user.chat_id)
          
          console.log(`✅ Updated ${user.chat_id}: ${user.username || 'NULL'} → @${chatInfo.username}`)
          updated++
        } else {
          noChange++
        }
      } else {
        console.log(`⚠️ User ${user.chat_id} has no username`)
      }
      
      // Задержка 100ms (макс. 10 req/sec)
      await new Promise(r => setTimeout(r, 100))
    } catch (error: any) {
      failed++
      console.error(`❌ Failed for ${user.chat_id}:`, error.message)
    }
  }
  
  console.log('\n✅ Done!')
  console.log(`✅ Updated: ${updated}`)
  console.log(`➖ No change: ${noChange}`)
  console.log(`❌ Failed: ${failed}`)
  
  process.exit(0)
}

forceUpdateUsernames().catch(err => {
  console.error('❌ Script error:', err)
  process.exit(1)
})
