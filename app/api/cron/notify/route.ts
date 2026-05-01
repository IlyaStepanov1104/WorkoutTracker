import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (!token || !chatId) {
    return NextResponse.json({ error: 'Telegram not configured' }, { status: 500 });
  }

  const db = createServerClient();
  const today = new Date().getDay(); // 0=Sun...6=Sat

  const { data: scheduleRow } = await db
    .from('schedule')
    .select('plan_id')
    .eq('day_of_week', today)
    .maybeSingle();

  if (!scheduleRow?.plan_id) {
    return NextResponse.json({ message: 'Rest day, no notification sent' });
  }

  const { data: plan } = await db
    .from('workout_plans')
    .select('name')
    .eq('id', scheduleRow.plan_id)
    .single();

  const { data: planExercises } = await db
    .from('plan_exercises')
    .select('sets, rep_min, rep_max, exercise:exercises(name)')
    .eq('plan_id', scheduleRow.plan_id)
    .order('sort_order');

  if (!plan || !planExercises) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  type PlanExRow = { sets: number; rep_min: number; rep_max: number; exercise: { name: string }[] | { name: string } | null };
  const exerciseLines = (planExercises as PlanExRow[])
    .map(pe => {
      const name = Array.isArray(pe.exercise) ? pe.exercise[0]?.name : pe.exercise?.name;
      return `• ${name ?? '?'} — ${pe.sets}×${pe.rep_min}–${pe.rep_max}`;
    })
    .join('\n');

  const text = [
    `💪 <b>Тренировка сегодня: ${plan.name}</b>`,
    '',
    'Упражнения:',
    exerciseLines,
    '',
    `👉 <a href="${appUrl}">Открыть приложение</a>`,
  ].join('\n');

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });

  if (!res.ok) {
    const err = await res.json();
    return NextResponse.json({ error: err }, { status: 500 });
  }

  return NextResponse.json({ ok: true, plan: plan.name });
}
