'use client';
import { useEffect, useState } from 'react';
import { CATEGORY_VIDEOS } from '@/lib/videos';

export default function RotatingVideo({ category, preload = 'auto' }: { category: string; preload?: 'auto' | 'metadata' }) {
  const list = CATEGORY_VIDEOS[category] ?? CATEGORY_VIDEOS.all;
  const [idx, setIdx] = useState<number | null>(null);

  // svaki put kad se strana otvori ili osveži, nasumičan video iz liste (svaki blok bira posebno)
  useEffect(() => {
    setIdx(Math.floor(Math.random() * list.length));
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
