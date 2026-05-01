'use client';
import React, { useState } from 'react';
import { AppSettings } from '@/lib/types';
import { updateSettings } from '@/lib/actions';
import { useWeightUnit } from '@/hooks/useWeightUnit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Bell, Scale } from 'lucide-react';
import { showToast } from '@/components/ui/toast';

interface Props {
  settings: AppSettings;
}

export function SettingsClient({ settings: initial }: Props) {
  const { unit, toggle } = useWeightUnit();
  const [settings, setSettings] = useState<AppSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);

  function update(key: keyof AppSettings, value: number) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateSettings(settings);
      showToast('Настройки сохранены', 'success');
    } catch {
      showToast('Ошибка при сохранении', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestTelegram() {
    setTestingTelegram(true);
    try {
      const res = await fetch('/api/telegram/test', { method: 'POST' });
      if (res.ok) showToast('Тестовое сообщение отправлено', 'success');
      else showToast('Ошибка отправки — проверь токен и chat_id', 'error');
    } catch {
      showToast('Ошибка сети', 'error');
    } finally {
      setTestingTelegram(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" /> Настройки
      </h1>

      {/* Telegram */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" /> Telegram-уведомления
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Статус</span>
            <span className={`text-sm font-medium ${process.env.TELEGRAM_BOT_TOKEN ? 'text-green-600' : 'text-muted-foreground'}`}>
              Настроен через .env
            </span>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleTestTelegram}
            disabled={testingTelegram}
          >
            {testingTelegram ? 'Отправка...' : 'Отправить тестовое сообщение'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Уведомления отправляются ежедневно в 8:00 UTC при наличии тренировки по расписанию.
          </p>
        </CardContent>
      </Card>

      {/* Rest timers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Таймер отдыха (секунды)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Label className="w-36 text-sm">Базовые упражнения</Label>
            <Input
              type="number"
              value={settings.compound_rest_seconds}
              onChange={e => update('compound_rest_seconds', Number(e.target.value))}
              className="flex-1 h-9"
              min={10} max={600}
            />
          </div>
          <div className="flex items-center gap-3">
            <Label className="w-36 text-sm">Изолирующие</Label>
            <Input
              type="number"
              value={settings.isolation_rest_seconds}
              onChange={e => update('isolation_rest_seconds', Number(e.target.value))}
              className="flex-1 h-9"
              min={10} max={600}
            />
          </div>
        </CardContent>
      </Card>

      {/* Weight increments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Инкремент веса (кг)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Label className="w-36 text-sm">Базовые упражнения</Label>
            <Input
              type="number"
              value={settings.compound_weight_increment}
              onChange={e => update('compound_weight_increment', Number(e.target.value))}
              className="flex-1 h-9"
              min={0.5} max={10} step={0.5}
            />
          </div>
          <div className="flex items-center gap-3">
            <Label className="w-36 text-sm">Изолирующие</Label>
            <Input
              type="number"
              value={settings.isolation_weight_increment}
              onChange={e => update('isolation_weight_increment', Number(e.target.value))}
              className="flex-1 h-9"
              min={0.25} max={5} step={0.25}
            />
          </div>
        </CardContent>
      </Card>

      {/* Units */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4" /> Единицы измерения
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>Фунты (lbs)</Label>
            <Switch checked={unit === 'lbs'} onCheckedChange={toggle} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Текущий режим: <strong>{unit === 'kg' ? 'Килограммы' : 'Фунты'}</strong>. Данные хранятся в кг.
          </p>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? 'Сохранение...' : 'Сохранить настройки'}
      </Button>
    </div>
  );
}
