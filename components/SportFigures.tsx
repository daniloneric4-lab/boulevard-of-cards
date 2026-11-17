'use client';

import { useEffect, useRef } from 'react';
import { STORIES, hasHero } from '@/lib/heroes';

// Ilustrovane scene sa strane liste kartica. Svaka scena stoji na svom mestu u stranici
// (skroluje se zajedno sa karticama) i pusti se kad se do nje dođe; ostaje na poslednjem kadru.

export default function SportFigures({ sport }: { sport: string }) {
  const root = useRef<HTMLDivElement>(null);
  const scenes = hasHero(sport) ? STORIES[sport] : [];

  useEffect(() => {
    if (!scenes.length || !root.current) return;
    const box = root.current;
    const slots = Array.from(box.querySelectorAll<HTMLDivElement>('.sf'));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const layout = () => {
      const host = box.parentElement!;
      const grids = Array.from(document.querySelectorAll<HTMLElement>('.grid-tiles'));
      if (!grids.length) return;
      const hostTop = host.getBoundingClientRect().top + window.scrollY;
      const top = grids[0].getBoundingClientRect().top + window.scrollY - hostTop;
      const last = grids[grids.length - 1].getBoundingClientRect();
      const bottom = last.bottom + window.scrollY - hostTop;
      const gutter = (document.documentElement.clientWidth - 1040) / 2;
      const w = Math.min(300, gutter - 24);
      box.classList.toggle('off', w < 160);
      const h = (w * 16) / 9;
      const span = Math.max(0, bottom - top - h);
      slots.forEach((s) => {
        const at = Number(s.dataset.at);
        s.style.width = `${w}px`;
        s.style.top = `${top + at * span}px`;
        s.style.left = s.dataset.side === 'L' ? `${(gutter - w) / 2}px` : `${document.documentElement.clientWidth - gutter + (gutter - w) / 2}px`;
      });
    };

    const play = (s: HTMLDivElement) => {
      if (s.dataset.done) return;
      s.dataset.done = '1';
      const v = s.querySelector('video')!;
      const list: string[] = JSON.parse(s.dataset.list || '[]');
      let i = 0;
      const next = () => {
        if (i >= list.length) return;
        v.src = list[i++];
        if (reduce && i === list.length) {
          v.addEventListener('loadedmetadata', () => { v.currentTime = Math.max(0, v.duration - 0.05); }, { once: true });
          return;
        }
        v.play().catch(() => {});
      };
      v.addEventListener('ended', next);
      next();
      s.classList.add('on');
    };

    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) play(e.target as HTMLDivElement); }),
      { threshold: 0.45 },
    );
    layout();
    slots.forEach((s) => io.observe(s));
    const ro = new ResizeObserver(layout);
    ro.observe(document.body);
    window.addEventListener('resize', layout);
    return () => { io.disconnect(); ro.disconnect(); window.removeEventListener('resize', layout); };
  }, [sport]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!scenes.length) return null;
  return (
    <div ref={root} className="sport-figs" aria-hidden="true">
      {scenes.flatMap((sc, k) =>
        (['L', 'R'] as const).filter((side) => sc[side]?.length).map((side) => (
          <div key={`${k}${side}`} className="sf" data-side={side} data-at={sc.at} data-list={JSON.stringify(sc[side])}>
            <video src={sc[side]![0]} muted playsInline preload="metadata" />
          </div>
        )),
      )}
    </div>
  );
}
