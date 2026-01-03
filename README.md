# 📊 Анализ Telegram-бота для скачивания видео Sora AI

## 🎯 **Основная функциональность бота**

### **Главные возможности:**
1. **Скачивание видео с Sora AI** (sora.chatgpt.com)
   - Поддержка нескольких URL одновременно (до 5 штук)
   - Fallback система: основной API (dyysy) → резервный API (vid7)
   - Прокси-система для обхода ограничений Telegram

2. **Мультиязычность (i18n)**
   - Русский и английский интерфейс
   - Автоопределение языка по региону пользователя
   - CIS страны → русский, остальные → английский

3. **Управление описаниями видео**
   - Переключатель "Text On/Off" для отображения описаний
   - Описания отправляются как caption к видео
   - Длинные описания (>900 символов) отправляются отдельным сообщением

4. **Статистика пользователя**
   - Общее количество скачанных видео
   - Разбивка по API (основной/резервный)
   - Количество ошибок
   - Дата регистрации

5. **Публикация в канал**
   - Автоматическая отправка видео в Telegram-канал
   - Отображение источника (username/имя пользователя)
   - Информация об используемом API

6. **Rate Limiting**
   - 10 запросов в минуту
   - Кулдаун 10 секунд на кнопки
   - Защита от спама

7. **Admin Panel**
   - Статистика пользователей (username, язык, настройка Text)
   - История загрузок с username
   - Фильтрация по последним 24 часам
   - Пагинация (50 записей на страницу)

***

## 📁 **Структура кодовой базы**

### **Backend (Next.js API Routes)**
```
/api
├── /webhook         → Обработка Telegram webhooks
├── /video/[id]      → Прокси для видео (обход ограничений)
├── /admin/users     → API админ-панели (пользователи)
└── /admin/downloads → API админ-панели (загрузки)
```

### **Bot Logic (src/lib/bot/)**
```
/bot
├── index.ts         → Основной файл бота (команды, кнопки)
├── handlers.ts      → Обработка URL, скачивание видео
└── rate-limit.ts    → Ограничение запросов
```

### **Utilities (src/lib/)**
```
/lib
├── i18n.ts              → Переводы (ru/en)
├── sora-api.ts          → API для скачивания Sora
├── sorapure-downloader.ts → Парсинг и загрузка видео
├── telegram-channel.ts  → Публикация в канал
├── video-cache.ts       → Кеширование видео (50 файлов, 1 час)
├── supabase.ts          → База данных
└── /admin/api.ts        → Admin API функции
```

### **Database (Supabase)**
```sql
users:
  - chatid (PK)
  - username
  - firstname
  - language (ru/en)
  - showvideotext (boolean)
  - createdat

downloads:
  - id (PK)
  - chatid (FK)
  - username
  - soraurl
  - videourl
  - apiused (dyysy/vid7/web)
  - success (boolean)
  - createdat

ratelimits:
  - chatid (PK)
  - lastrequest
  - requestcount
  - lastbuttonclick
```

***

## ⚡ **Технический стек**

| Компонент | Технология |
|-----------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Bot Library | Telegraf |
| Database | Supabase (PostgreSQL) |
| Deployment | Vercel |
| APIs | dyysy.com, vid7.net |

***

## 🔍 **Детальный анализ функций**

### **1. Система скачивания**
```typescript
processSora() → downloadSoraVideo() → dyysy API
  ↓ (если ошибка)
processSoraVid7() → downloadViaVid7() → vid7 API
```

**Особенности:**
- Парсинг HTML для извлечения video URL и описания
- Поддержка различных форматов Sora URL
- Обработка ошибок (404, timeout, 403, 500)
- Извлечение метаданных (title, description)

### **2. Прокси-система**
```typescript
createProxyUrl() → сохранение в БД → /api/video/[id]
```

**Зачем нужно:**
- Telegram не может напрямую скачать видео с внешних API
- Прокси через Vercel решает проблему CORS
- Кеширование для повторных запросов

### **3. Кеш видео**
```typescript
Cache Map:
  - Макс. 50 видео
  - TTL: 1 час
  - LRU eviction (удаление старых)
```

**Оптимизация:**
- Повторные запросы не бьют в API
- Экономия трафика
- Быстрая отдача

### **4. Rate Limiting**
```typescript
checkRateLimit(): 10 req/min
checkButtonCooldown(): 10 sec между кликами
```

**Защита:**
- От DDoS
- От спама
- От перегрузки API

***

## 🎨 **UI/UX бота**

### **Главное меню (клавиатура):**
```
┌──────────────────┬──────────────┐
│ 📊 Статистика    │ 📝 Text On   │
├──────────────────┼──────────────┤
│ 🌐 Язык          │ 💬 Поддержка │
└──────────────────┴──────────────┘
```

### **Настройки:**
```
┌─────────────────────────────────┐
│ ✅ Описание видео: 📝 Text Off  │
├─────────────────────────────────┤
│ 🌐 Язык                         │
├─────────────────────────────────┤
│ ◀️ Назад                        │
└─────────────────────────────────┘
```

### **Inline кнопки:**
- **Watermark on video** → Retry (повторная загрузка)
- **Contact support** → Переход в @feedbckbot

***

## ✅ **Что работает хорошо**

1. ✅ **Надежная fallback система** (2 API источника)
2. ✅ **Мультиязычность** с автоопределением
3. ✅ **Продуманная структура БД** (индексы, связи)
4. ✅ **Rate limiting** защита
5. ✅ **Кеширование** для оптимизации
6. ✅ **Админ-панель** с фильтрами
7. ✅ **Обработка ошибок** с понятными сообщениями
8. ✅ **Прокси-система** для обхода ограничений Telegram

***

## 🚀 **Рекомендации по улучшению**

### **1. Безопасность 🔒**

#### **Критично:**
```typescript
// ❌ Плохо: пароль в переменных окружения
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// ✅ Хорошо: JWT токены с истечением
import jwt from 'jsonwebtoken';
const token = jwt.sign({ role: 'admin' }, SECRET, { expiresIn: '24h' });
```

**Что добавить:**
- JWT authentication для админ-панели
- Rate limiting для /api/admin/* endpoints
- CSRF защита
- IP whitelist для админки

***

### **2. Производительность ⚡**

#### **Проблема: множественные запросы в БД**
```typescript
// ❌ Текущий код (N+1 проблема)
for (const url of urls) {
  await supabase.from('downloads').insert(...);
  await processUrl(...);
}

// ✅ Улучшение: batch operations
const results = await Promise.allSettled(urls.map(url => processUrl(url)));
await supabase.from('downloads').insert(results.map(...));
```

**Что оптимизировать:**
- Batch database inserts
- Connection pooling
- Redis для кеша (вместо in-memory Map)
- CDN для видео файлов

***

### **3. Мониторинг 📊**

**Чего не хватает:**
```typescript
// Добавить:
import * as Sentry from '@sentry/nextjs';

// Логирование ошибок
Sentry.captureException(error, {
  tags: { chatId, apiUsed },
  extra: { soraUrl, videoUrl }
});

// Метрики производительности
const startTime = Date.now();
await processVideo();
console.log(`Processing took: ${Date.now() - startTime}ms`);
```

**Инструменты:**
- Sentry для error tracking
- Grafana + Prometheus для метрик
- Vercel Analytics для frontend
- Custom dashboard для бизнес-метрик

***

### **4. Функциональность 🎯**

#### **A. Очередь загрузок**
```typescript
// Вместо синхронной обработки
import Bull from 'bull';

const videoQueue = new Bull('video-downloads', REDIS_URL);

videoQueue.process(async (job) => {
  const { url, chatId } = job.data;
  return await processVideo(url, chatId);
});

// Добавление в очередь
await videoQueue.add({ url, chatId }, { 
  priority: isPremium ? 1 : 5,
  attempts: 3 
});
```

#### **B. Premium функции**
```typescript
interface PremiumFeatures {
  maxUrlsPerRequest: 10,  // вместо 5
  priorityQueue: true,
  noWatermark: true,
  downloadHistory: true,  // сохранение на 30 дней
  customQuality: '1080p' | '4k'
}
```

#### **C. Webhook вместо polling**
```typescript
// Текущий код использует webhooks ✅
// Но можно добавить health checks:

setInterval(async () => {
  const info = await bot.telegram.getWebhookInfo();
  if (!info.url) {
    await bot.telegram.setWebhook(WEBHOOK_URL);
  }
}, 300000); // каждые 5 минут
```

***

### **5. База данных 💾**

#### **Добавить индексы:**
```sql
-- Для быстрого поиска
CREATE INDEX idx_downloads_chatid_createdat 
  ON downloads(chatid, createdat DESC);

-- Для аналитики
CREATE INDEX idx_downloads_apiused_success 
  ON downloads(apiused, success);

-- Для админки
CREATE INDEX idx_users_language_showvideotext 
  ON users(language, showvideotext);
```

#### **Добавить партиционирование:**
```sql
-- Разделение по месяцам для старых данных
CREATE TABLE downloads_2026_01 PARTITION OF downloads
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

#### **Архивация старых данных:**
```typescript
// Cron job для архивации
export async function archiveOldDownloads() {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const { data } = await supabase
    .from('downloads')
    .select('*')
    .lt('createdat', threeMonthsAgo.toISOString());
  
  // Сохранить в S3 или отдельную таблицу
  await saveToArchive(data);
  
  // Удалить из основной таблицы
  await supabase
    .from('downloads')
    .delete()
    .lt('createdat', threeMonthsAgo.toISOString());
}
```

***

### **6. UX улучшения 🎨**

#### **A. Прогресс загрузки**
```typescript
// Показывать процент
const statusMsg = await ctx.reply('⏳ Загрузка: 0%');

await updateProgress(statusMsg, 25, 'Получение ссылки...');
await updateProgress(statusMsg, 50, 'Скачивание видео...');
await updateProgress(statusMsg, 75, 'Обработка...');
await updateProgress(statusMsg, 100, 'Готово!');
```

#### **B. История загрузок**
```typescript
bot.command('history', async (ctx) => {
  const { data } = await supabase
    .from('downloads')
    .select('soraurl, createdat')
    .eq('chatid', ctx.chat.id)
    .eq('success', true)
    .order('createdat', { ascending: false })
    .limit(10);
  
  const keyboard = Markup.inlineKeyboard(
    data.map(d => [
      Markup.button.callback(
        `📹 ${new Date(d.createdat).toLocaleDateString()}`,
        `redownload:${d.soraurl}`
      )
    ])
  );
  
  await ctx.reply('📚 История загрузок:', keyboard);
});
```

#### **C. Превью видео**
```typescript
// Отправка thumbnail перед видео
await ctx.replyWithPhoto(thumbnailUrl, {
  caption: '⏳ Загружаем видео...'
});

await ctx.replyWithVideo(videoUrl);
```

***

### **7. Аналитика 📈**

**Добавить дашборд с метриками:**

```typescript
interface AnalyticsDashboard {
  realtime: {
    activeUsers: number,
    requestsPerMinute: number,
    averageResponseTime: number
  },
  daily: {
    newUsers: number,
    totalDownloads: number,
    successRate: number,
    topErrors: string[]
  },
  trends: {
    userGrowth: Array<{date: string, count: number}>,
    popularTimes
