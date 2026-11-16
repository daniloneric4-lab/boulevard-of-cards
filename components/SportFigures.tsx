'use client';

import { useEffect, useRef } from 'react';
import { hasHero } from '@/lib/heroes';

// Bočna traka sa glavnim likom sporta (kratak ilustrovani video na beloj pozadini).
// Video krene kad se skroluje ispod vrha prodavnice i stane na poslednjem kadru.

export default function SportFigures({ sport }: { sport: string }) {
  const root = useRef<HTMLDivElement>(null);
  const ok = hasHero(sport);

  useEffect(() => {
    if (!ok || !root.current) return;
    const el = root.current;
    const v = el.querySelector('video')!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let started = false;

    const start = () => {
      if (started) return;
      started = true;
      if (reduce) {
        // bez pokreta: odmah završni kadar
        const go = () => { v.currentTime = Math.max(0, v.duration - 0.05); };
        if (v.readyState >= 1) go(); else v.addEventListener('loadedmetadata', go, { once: true });
        return;
      }
      v.play().catch(() => {});
    };

    const onScroll = () => {
      const hero = document.querySelector('.hero-shop');
      const below = hero ? hero.getBoundingClientRect().bottom < window.innerHeight * 0.6 : true;
      el.classList.toggle('on', below);
      if (below) start();
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ok, sport]);

  if (!ok) return null;
  return (
    <div ref={root} className="sport-figs" aria-hidden="true">
      <div className="sf sf-R">
        <video src={`/vizuali/heroji/${sport}.mp4`} muted playsInline preload="auto" />
      </div>
    </div>
  );
}
