"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Toast = { id: string; type: 'success' | 'error' | 'info'; message: string };

const ToastContext = createContext<{ push: (t: Omit<Toast, 'id'>) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = (t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((s) => [...s, { id, ...t }]);
  };

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) =>
      setTimeout(() => setToasts((s) => s.filter((x) => x.id !== t.id)), 4000)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed right-4 bottom-4 w-full max-w-xs space-y-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} className={`p-3 rounded shadow ${t.type === 'success' ? 'bg-green-600 text-white' : t.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
