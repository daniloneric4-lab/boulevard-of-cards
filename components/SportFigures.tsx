'use client';

import { useEffect, useRef } from 'react';
import { STORIES, hasHero } from '@/lib/heroes';

// Ilustrovane scene sa strane liste kartica. Svaka scena stoji na svom mestu u stranici
// (skroluje se zajedno sa karticama). Levi i desni video iste scene kreću zajedno kad se
// do scene dođe i ostaju na poslednjem kadru.

export default function SportFigures({ sport }: { sport: string }) {
  const root = useRef<HTMLDivElement>(null);
  const scenes = hasHero(sport) ? STORIES[sport] : [];

  useEffect(() => {
    if (!scenes.length || !root.current) return;
    const box = root.current;
    const slots = Array.from(box.querySelectorAll<HTMLDivElement>('.sf'));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const started = new Set<string>();

    // svaki video: utišan (autoplay), prikaži prvi kadar čim se učita
    slots.forEach((s) => {
      const v = s.querySelector('video')!;
      v.muted = true;
      v.defaultMuted = true;
      v.setAttribute('muted', '');
      const show = () => s.classList.add('on');
      if (v.readyState >= 2) show();
      else v.addEventListener('loadeddata', show, { once: true });
      v.addEventListener('error', () => { s.classList.remove('on'); }, { once: true });
    });

    const layout = () => {
      const host = box.parentElement!;
      const grids = Array.from(document.querySelectorAll<HTMLElement>('.grid-tiles'));
      if (!grids.length) return;
      const hostTop = host.getBoundingClientRect().top + window.scrollY;
      const top = grids[0].getBoundingClientRect().top + window.scrollY - hostTop;
      const last = grids[grids.length - 1].getBoundingClientRect();
      const bottom = last.bottom + window.scrollY - hostTop;
      const vw = document.documentElement.clientWidth;
      // video stoji uz ivicu ekrana, veličine kao ranije (do 300px)
      const g = grids[0].getBoundingClientRect();
      const wl = Math.min(300, Math.max(0, g.left - 8));
      const wr = Math.min(300, Math.max(0, vw - g.right - 8));
      box.classList.toggle('off', Math.min(wl, wr) < 160);
      const span = (h: number) => Math.max(0, bottom - top - h);
      slots.forEach((s) => {
        const at = Number(s.dataset.at);
        const L = s.dataset.side === 'L';
        const w = L ? wl : wr;
        s.style.width = `${w}px`;
        s.style.top = `${top + at * span((w * 16) / 9)}px`;
        s.style.left = L ? '0px' : `${vw - w}px`;
      });
    };

    const playSlot = (s: HTMLDivElement) => {
      const v = s.querySelector('video')!;
      const list: string[] = JSON.parse(s.dataset.list || '[]');
      let i = 0;
      const tryPlay = () => {
        const p = v.play();
        if (p) p.catch(() => { v.muted = true; v.play().catch(() => {}); });
      };
      const next = () => {
        if (i >= list.length) return;
        const src = list[i++];
        if (!v.currentSrc.endsWith(src)) { v.src = src; v.load(); }
        if (reduce && i === list.length) {
          const end = () => { v.currentTime = Math.max(0, v.duration - 0.05); };
          if (v.readyState >= 1) end(); else v.addEventListener('loadedmetadata', end, { once: true });
          return;
        }
        if (v.readyState >= 3) tryPlay();
        else v.addEventListener('canplay', tryPlay, { once: true });
      };
      v.addEventListener('ended', next);
      next();
    };

    // scena kreće kad bilo koji njen video uđe u ekran; pokreće obe strane zajedno
    const check = () => {
      const vh = window.innerHeight;
      slots.forEach((s) => {
        const k = s.dataset.scene!;
        if (started.has(k)) return;
        const r = s.getBoundingClientRect();
        if (r.height && r.top < vh * 0.8 && r.bottom > vh * 0.2) {
          started.add(k);
          slots.filter((x) => x.dataset.scene === k).forEach(playSlot);
        }
      });
    };

    layout();
    check();
    const onScroll = () => check();
    const onResize = () => { layout(); check(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(document.body);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    };
  }, [sport]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!scenes.length) return null;
  return (
    <div ref={root} className="sport-figs" aria-hidden="true">
      {scenes.flatMap((sc, k) =>
        (['L', 'R'] as const).filter((side) => sc[side]?.length).map((side) => (
          <div key={`${k}${side}`} className="sf" data-scene={k} data-side={side} data-at={sc.at} data-list={JSON.stringify(sc[side])}>
            <video src={sc[side]![0]} muted playsInline preload="auto" />
          </div>
        )),
      )}
    </div>
  );
}
