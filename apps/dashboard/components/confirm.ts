"use client";

export function confirmAction(message: string) {
  if (typeof window === 'undefined') return false;
  return window.confirm(message);
}
