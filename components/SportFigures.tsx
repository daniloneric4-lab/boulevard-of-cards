'use client';

import { useEffect, useRef } from 'react';

// Bočne trake sa malim ilustrovanim video scenama (levo rival, desno pobednik).
// Kad trake postanu vidljive, levo krene video, pa desno odgovori; video stane na poslednjem kadru.
// Videi: /public/vizuali/<sport>/<L|R><scena>.mp4 (za sada po jedna scena na strani).

type Side = 'L' | 'R';
const SETS: Record<string, { L: string[]; R: string[] }> = {
  f1: { L: ['L0.mp4'], R: ['R0.mp4'] },
};

export default function SportFigures({ sport }: { sport: string }) {
  const set = SETS[sport];
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!set || !root.current) return;
    const el = root.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const vids = (['L', 'R'] as Side[]).map((s) => el.querySelector<HTMLVideoElement>(`[data-side="${s}"] video`)!);
    let started = false;
    let t: ReturnType<typeof setTimeout> | undefined;

    const start = () => {
      if (started) return;
      started = true;
      if (reduce) {
        // bez pokreta: odmah prikaži završni kadar
        vids.forEach((v) => { const go = () => { v.currentTime = Math.max(0, v.duration - 0.05); }; v.readyState >= 1 ? go() : v.addEventListener('loadedmetadata', go, { once: true }); });
        return;
      }
      vids[0].play().catch(() => {});
      t = setTimeout(() => vids[1].play().catch(() => {}), 700);
    };

    const onScroll = () => {
      const hero = document.querySelector('.hero-shop');
      const below = hero ? hero.getBoundingClientRect().bottom < window.innerHeight * 0.6 : true;
      const nearEnd = window.scrollY > document.documentElement.scrollHeight - window.innerHeight * 1.25;
      const on = below && !nearEnd;
      el.classList.toggle('on', on);
      if (on) start();
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (t) clearTimeout(t);
    };
  }, [sport, set]);

  if (!set) return null;
  return (
    <div ref={root} className="sport-figs" aria-hidden="true">
      {(['L', 'R'] as Side[]).map((side) => (
        <div key={side} className={'sf sf-' + side} data-side={side}>
          <video src={`/vizuali/${sport}/${set[side][0]}`} muted playsInline preload="auto" />
        </div>
      ))}
    </div>
  );
}
