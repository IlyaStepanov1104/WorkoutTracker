'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg text-white text-sm font-medium transition-all',
        type === 'success' && 'bg-green-600',
        type === 'error' && 'bg-destructive',
        type === 'info' && 'bg-primary'
      )}
    >
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
    </div>
  );
}

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastListeners: ((toast: ToastState) => void)[] = [];
let nextId = 0;

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  toastListeners.forEach(l => l({ id: nextId++, message, type }));
}

export function ToastContainer() {
  const [toasts, setToasts] = React.useState<ToastState[]>([]);

  React.useEffect(() => {
    const listener = (toast: ToastState) => setToasts(prev => [...prev, toast]);
    toastListeners.push(listener);
    return () => { toastListeners = toastListeners.filter(l => l !== listener); };
  }, []);

  const remove = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />
      ))}
    </div>
  );
}
