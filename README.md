# Workout Tracker

Персональный трекер тренировок — полностью стековое Next.js 14 приложение с Supabase, Telegram-уведомлениями и Vercel Cron Jobs.

## Стек

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Styling:** Tailwind CSS + shadcn/ui (ручная сборка)
- **Database:** Supabase (Postgres)
- **Notifications:** Telegram Bot API
- **Scheduling:** Vercel Cron Jobs
- **Deployment:** Vercel

## Быстрый старт

### 1. Клонировать и установить зависимости

```bash
git clone <repo-url>
cd WorkoutTracker
npm install
```

### 2. Настроить Supabase

1. Зайти на [supabase.com](https://supabase.com) и создать новый проект.
2. В разделе **SQL Editor** выполнить содержимое файла `supabase/schema.sql` — создаст таблицы, политики RLS и заполнит seed-данными (упражнения, планы, расписание по умолчанию).
3. В разделе **Project Settings → API** скопировать:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Настроить Telegram-бота

1. Написать [@BotFather](https://t.me/BotFather) в Telegram.
2. Команда `/newbot` → придумать имя и username → получить **HTTP API token**.
3. Написать своему боту любое сообщение, затем открыть:
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
   В ответе найти поле `"chat"."id"` — это ваш `CHAT_ID`.
4. Добавить в `.env.local`:
   ```
   TELEGRAM_BOT_TOKEN=<token>
   TELEGRAM_CHAT_ID=<chat_id>
   ```

### 4. Переменные окружения

Создать файл `.env.local` (пример в `.env.local.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
CRON_SECRET=any-random-secret-string
```

### 5. Запуск локально

```bash
npm run dev
```

Открыть [http://localhost:3000](http://localhost:3000).

## Деплой на Vercel

1. Запушить код в GitHub.
2. На [vercel.com](https://vercel.com) выбрать «Add New Project» → указать репозиторий.
3. В разделе **Environment Variables** добавить все переменные из `.env.local`.
4. Нажать **Deploy**.

Файл `vercel.json` автоматически настраивает Cron Job — ежедневно в **8:00 UTC** отправляет Telegram-уведомление с тренировкой на сегодня (если она есть в расписании).

### Защита Cron endpoint

Переменная `CRON_SECRET` защищает `/api/cron/notify` — Vercel автоматически передаёт `Authorization: Bearer <CRON_SECRET>` в заголовке при вызове Cron Job.

## Функциональность

| Страница | Описание |
|---|---|
| `/` | Дашборд: тренировка на сегодня, незавершённые сессии, 7-дневный превью, история |
| `/schedule` | Расписание тренировок на неделю |
| `/plans` | Список планов (базовые + кастомные) |
| `/plans/[id]/edit` | Редактор плана с drag-and-drop |
| `/workout/[id]` | Активная тренировка: логирование подходов, таймер отдыха |
| `/workout/[id]/report` | Отчёт о тренировке с заметками и шерингом |
| `/report/[token]` | Публичный отчёт (read-only) |
| `/settings` | Настройки таймера, инкремента веса, единиц измерения |

## Алгоритм прогрессии (Double Progression)

- Все подходы на `rep_max` → +инкремент веса
- ≥ 2/3 подходов на `rep_max` → тот же вес
- Большинство подходов < `rep_min` → −инкремент веса
- Иначе → тот же вес

## Структура проекта

```
app/
  page.tsx                    # Dashboard
  plans/page.tsx              # Список планов
  plans/[id]/edit/page.tsx    # Редактор плана
  schedule/page.tsx           # Расписание
  workout/[sessionId]/        # Активная тренировка
  report/[token]/page.tsx     # Публичный отчёт
  settings/page.tsx           # Настройки
  api/cron/notify/route.ts    # Telegram cron
  api/telegram/test/route.ts  # Тест уведомления
components/
  ui/                         # shadcn/ui компоненты
  NavBar.tsx                  # Нижняя навигация
  DashboardClient.tsx
  ScheduleClient.tsx
  PlansClient.tsx
  PlanEditorClient.tsx
  WorkoutPageClient.tsx
  WorkoutReportClient.tsx
  SettingsClient.tsx
  ExercisePicker.tsx
  RestTimerOverlay.tsx
context/
  WorkoutContext.tsx           # React Context для активной тренировки
hooks/
  useTimer.ts                  # Countdown + elapsed timers
  useWeightUnit.ts             # kg/lbs toggle
lib/
  supabase.ts                  # Supabase client (browser + server)
  types.ts                     # TypeScript interfaces
  utils.ts                     # Утилиты (форматирование, расчёты)
  actions.ts                   # Server Actions
supabase/
  schema.sql                   # DDL + seed данные
```
