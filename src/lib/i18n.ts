// src/lib/i18n.ts
export type Language = 'ru' | 'en';

export const translations = {
  ru: {
    // Команда /start
    welcome: '👋 Привет! Я бот для скачивания видео из Sora AI.',
    howToUse: '📝 Как использовать:',
    step1: '1. Отправь ссылку на Sora видео',
    step2: '2. Получи видео',
    step3: '3. Нажми кнопку "❌ Логотип на видео" если остался логотип',
    multipleLinks: '💡 Можно отправить до 5 ссылок за раз (каждая с новой строки)',
    limits: '⚡️ Лимиты: 10 запросов в минуту',
    questions: '❓ Есть вопросы?',
    
    // Кнопки
    btnSupport: '💬 Техподдержка',
    btnStats: '📊 Статистика',
    btnLanguage: '🌐 Язык',
    btnWatermark: '❌ Логотип на видео',
    btnContactSupport: '💬 Написать в поддержку',
    
    // Статистика
    yourStats: '📊 *Ваша статистика:*',
    totalDownloaded: '✅ Всего скачано: *{count}*',
    mainApi: '📹 Основной: {count}',
    reserveApi: '🎬 Резервный: {count}',
    errors: '❌ Ошибок: {count}',
    memberSince: '📅 С нами с: {date}',
    
    // Поддержка
    supportTitle: '💬 *Техническая поддержка*',
    supportText: 'Если у вас возникли проблемы с ботом, напишите в @feedbckbot',
    supportInclude: '📝 Укажите в сообщении:',
    supportLink: '• Ссылку на видео, которое не скачалось',
    supportProblem: '• Описание проблемы',
    supportScreenshot: '• Скриншот ошибки (если есть)',
    supportFast: 'Мы постараемся ответить как можно быстрее! 🚀',
    
    // Обработка
    processing: '⏳ Обработка...',
    downloading: '⏳ Скачиваю альтернативную версию...',
    processingMultiple: '📦 Обрабатываю {count} ссылок...',
    done: '✅ Готово',
    doneAlt: '✅ Готово (альтернативная версия)',
    fileSize: '📦 Размер: {size}',
    watermarkWarning: '⚠️ Если логотип остался,\n напишите в /support',
    
    // Ошибки
    errRateLimit: '⏱️ Слишком много запросов! Подождите минуту.',
    errButtonCooldown: '⏱️ Подождите 10 секунд перед следующим кликом.',
    errInvalidUrl: '❌ Отправьте корректную ссылку sora.chatgpt.com\n\nПример:\nhttps://sora.chatgpt.com/p/s_abc123...',
    errTooManyUrls: '❌ Максимум 5 ссылок за раз! Вы отправили: {count}',
    errVideoNotFound: '❌ Видео не найдено',
    errTimeout: '❌ Превышено время ожидания',
    errGeneric: '❌ Ошибка при скачивании',
    errPersists: '⚠️ Если проблема повторяется, обратитесь в техподдержку: @feedbckbot',
    errStats: '❌ Ошибка получения статистики.',
    
    // Админ
    adminPanel: '🔐 Админ-панель доступна по адресу:',
    adminPassword: '🔑 Пароль: {password}',
    adminNoAccess: '❌ У вас нет прав администратора.',
    
    // Выбор языка
    selectLanguage: '🌐 Выберите язык / Select language:',
    languageChanged: '✅ Язык изменён на Русский',
    
    // Рассылка
    broadcastSent: '✅ Рассылка отправлена {sent} пользователям',
    broadcastFailed: '❌ Не удалось отправить {failed} пользователям'
  },
  
  en: {
    // /start command
    welcome: '👋 Hello! I\'m a bot for downloading Sora AI videos.',
    howToUse: '📝 How to use:',
    step1: '1. Send a Sora video link',
    step2: '2. Get the video',
    step3: '3. Click "❌ Watermark on video" if logo remains',
    multipleLinks: '💡 You can send up to 5 links at once (each on a new line)',
    limits: '⚡️ Limits: 10 requests per minute',
    questions: '❓ Questions?',
    
    // Buttons
    btnSupport: '💬 Support',
    btnStats: '📊 Statistics',
    btnLanguage: '🌐 Language',
    btnWatermark: '❌ Watermark on video',
    btnContactSupport: '💬 Contact support',
    
    // Statistics
    yourStats: '📊 *Your statistics:*',
    totalDownloaded: '✅ Total downloaded: *{count}*',
    mainApi: '📹 Main: {count}',
    reserveApi: '🎬 Reserve: {count}',
    errors: '❌ Errors: {count}',
    memberSince: '📅 Member since: {date}',
    
    // Support
    supportTitle: '💬 *Technical Support*',
    supportText: 'If you have problems with the bot, write to @feedbckbot',
    supportInclude: '📝 Please include:',
    supportLink: '• Link to the video that didn\'t download',
    supportProblem: '• Problem description',
    supportScreenshot: '• Error screenshot (if any)',
    supportFast: 'We\'ll try to respond as quickly as possible! 🚀',
    
    // Processing
    processing: '⏳ Processing...',
    downloading: '⏳ Downloading alternative version...',
    processingMultiple: '📦 Processing {count} links...',
    done: '✅ Done',
    doneAlt: '✅ Done (alternative version)',
    fileSize: '📦 Size: {size}',
    watermarkWarning: '⚠️ If watermark remains,\n write to /support',
    
    // Errors
    errRateLimit: '⏱️ Too many requests! Wait a minute.',
    errButtonCooldown: '⏱️ Wait 10 seconds before next click.',
    errInvalidUrl: '❌ Send a valid sora.chatgpt.com link\n\nExample:\nhttps://sora.chatgpt.com/p/s_abc123...',
    errTooManyUrls: '❌ Maximum 5 links at once! You sent: {count}',
    errVideoNotFound: '❌ Video not found',
    errTimeout: '❌ Timeout exceeded',
    errGeneric: '❌ Download error',
    errPersists: '⚠️ If the problem persists, contact support: @feedbckbot',
    errStats: '❌ Error getting statistics.',
    
    // Admin
    adminPanel: '🔐 Admin panel is available at:',
    adminPassword: '🔑 Password: {password}',
    adminNoAccess: '❌ You don\'t have admin rights.',
    
    // Language
    selectLanguage: '🌐 Select language / Выберите язык:',
    languageChanged: '✅ Language changed to English',
    
    // Broadcast
    broadcastSent: '✅ Broadcast sent to {sent} users',
    broadcastFailed: '❌ Failed to send to {failed} users'
  }
};

export function t(lang: Language, key: string, params?: Record<string, string | number>): string {
  let text = (translations[lang] as any)[key] || key;
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      text = text.replace(`{${key}}`, String(value));
    });
  }
  
  return text;
}

export async function getUserLanguage(chatId: number): Promise<Language> {
  const { supabase } = await import('@/lib/supabase');
  const { data } = await supabase
    .from('users')
    .select('language')
    .eq('chat_id', chatId)
    .single();
  
  return (data?.language as Language) || 'ru';
}

export async function setUserLanguage(chatId: number, language: Language): Promise<void> {
  const { supabase } = await import('@/lib/supabase');
  await supabase
    .from('users')
    .update({ language })
    .eq('chat_id', chatId);
}
