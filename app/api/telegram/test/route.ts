import { NextResponse } from 'next/server';

export async function POST() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return NextResponse.json({ error: 'Telegram not configured' }, { status: 500 });
  }

  const text = `🧪 <b>Тестовое сообщение</b>\n\nWorkout Tracker работает корректно.\n\n<i>Это тест уведомлений.</i>`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
