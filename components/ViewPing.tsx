'use client';
import { useEffect } from 'react';
import { bumpView } from '@/app/_act/views';

/** Jednom po poseti (sesiji pregledača) javi da je oglas otvoren. */
export default function ViewPing({ kind, id }: { kind: 'listing' | 'product'; id: string }) {
  useEffect(() => {
    const k = `boc-seen-${kind}-${id}`;
    try {
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, '1');
    } catch {}
    bumpView(kind, id).catch(() => {});
  }, [kind, id]);
  return null;
}
