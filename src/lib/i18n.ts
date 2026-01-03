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
    buttonControls: 
      '🎛️ Управление:\n' +
      '📊 Статистика — ваши загрузки и история\n' +
      '📝 Текст — показывать/скрывать описание видео\n' +
      '🌐 Язык — переключение языка интерфейса\n' +
      '📞 Поддержка — связь с разработчиком\n',
    
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
    videoDescription: 'Описание',
    
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
    btnTextOn: '📝 Текст: Вкл',
    btnTextOff: '📝 Текст: Выкл',
    textEnabled: '✅ Описание видео включено',
    textDisabled: '❌ Описание видео выключено',
    
    // Рассылка
    broadcastSent: '✅ Рассылка отправлена {sent} пользователям',
    broadcastFailed: '❌ Не удалось отправить {failed} пользователям',
    btnSettings: '⚙️ Настройки',
    settingsTitle: '⚙️ *Настройки*',
    showVideoText: 'Описание видео',
    settingsUpdated: '✅ Настройки обновлены!',
    backToMenu: '◀️ Назад',
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
    buttonControls:
      '🎛️ Controls:\n' +
      '📊 Statistics — your downloads and history\n' +
      '📝 Text — show/hide video descriptions\n' +
      '🌐 Language — switch interface language\n' +
      '📞 Support — contact developer\n',
    
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
    videoDescription: 'Description',
    
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
    btnTextOn: '📝 Text: On',
    btnTextOff: '📝 Text: Off',
    textEnabled: '✅ Video description enabled',
    textDisabled: '❌ Video description disabled',
    
    // Broadcast
    broadcastSent: '✅ Broadcast sent to {sent} users',
    broadcastFailed: '❌ Failed to send to {failed} users',
    btnSettings: '⚙️ Settings',
    settingsTitle: '⚙️ *Settings*',
    showVideoText: 'Video description',
    settingsUpdated: '✅ Settings updated!',
    backToMenu: '◀️ Back',
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

export async function ensureUserExists(chatId: number, username?: string, languageCode?: string, firstName?: string): Promise<Language> {
  const { supabase } = await import('@/lib/supabase');
  
  const { data: user } = await supabase
    .from('users')
    .select('language, username, first_name')
    .eq('chat_id', chatId)
    .single();

  if (user) {
    // ✅ ОБНОВЛЯЕМ USERNAME И FIRST_NAME ЕСЛИ ИЗМЕНИЛИСЬ
    const updates: any = {};
    
    if (username && username !== user.username) {
      updates.username = username;
      console.log(`✅ Updated username for ${chatId}: ${username}`);
    }
    
    if (firstName && firstName !== user.first_name) {
      updates.first_name = firstName;
      console.log(`✅ Updated first_name for ${chatId}: ${firstName}`);
    }
    
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('users')
        .update(updates)
        .eq('chat_id', chatId);
    }
    
    return (user.language as Language) || 'ru';
  }

  // ✅ ОПРЕДЕЛЯЕМ ЯЗЫК ПО TELEGRAM LANGUAGE_CODE
  let defaultLanguage: Language = 'en';
  const cis_languages = ['ru', 'uk', 'be', 'kk', 'uz', 'ky', 'tg', 'az', 'hy', 'ka', 'mo'];
  
  if (languageCode && cis_languages.includes(languageCode.toLowerCase())) {
    defaultLanguage = 'ru';
    console.log(`🌐 User ${chatId} from CIS (${languageCode}) → Russian`);
  } else {
    console.log(`🌐 User ${chatId} language: ${languageCode || 'unknown'} → English`);
  }

  // Новый пользователь
  await supabase
    .from('users')
    .insert({
      chat_id: chatId,
      username: username || null,
      first_name: firstName || null, // ✅ Сохраняем имя
      language: defaultLanguage,
      show_video_text: false,
      created_at: new Date().toISOString()
    });

  console.log(`✅ Created user ${chatId} with language: ${defaultLanguage}`);

  return defaultLanguage;
}