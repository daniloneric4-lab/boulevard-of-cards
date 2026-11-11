'use client';
import { useEffect, useState } from 'react';
import { CATEGORY_VIDEOS } from '@/lib/videos';

// Broj poseta: povecava se jednom po poseti (sesiji pregledaca), cuva se u pregledacu.
function visitNumber(): number {
  try {
    const counted = sessionStorage.getItem('boc-visit-counted');
    let n = parseInt(localStorage.getItem('boc-visits') || '0', 10) || 0;
    if (!counted) {
      n += 1;
      localStorage.setItem('boc-visits', String(n));
      sessionStorage.setItem('boc-visit-counted', '1');
    }
    return n;
  } catch {
    return 1;
  }
}

export default function RotatingVideo({ category, preload = 'auto' }: { category: string; preload?: 'auto' | 'metadata' }) {
  const list = CATEGORY_VIDEOS[category] ?? CATEGORY_VIDEOS.all;
  const [idx, setIdx] = useState<number | null>(null);

  useEffect(() => {
    const n = visitNumber();
    setIdx((Math.max(n, 1) - 1) % list.length);
  }, [list.length]);

  const v = list[idx ?? 0];
  return (
    <video
      key={idx === null ? 'poster' : v.src}
      autoPlay
      muted
      loop
      playsInline
      preload={preload}
      poster={v.poster}
      aria-hidden="true"
      src={idx === null ? undefined : v.src}
      style={v.pos ? { objectPosition: v.pos } : undefined}
    />
  );
}
