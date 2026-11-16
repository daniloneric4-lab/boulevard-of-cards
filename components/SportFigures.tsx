'use client';

import { useEffect, useRef } from 'react';

// Veliki ilustrovani likovi iza kartica (levo rival, desno pobednik).
// Kad se skroluje u novi deo stranice, levo se smeni serija fotki, pa desno odgovori.
// Slike: /public/vizuali/<sport>/<L|R><scena>-<frejm>.webp, frejm 0 je originalna (završna) slika scene.

type Side = 'L' | 'R';
// L/R: broj frejmova po sceni; zoom: uvećanje po sceni (od dna) da likovi budu iste visine
const SETS: Record<string, { L: number[]; R: number[]; zoom?: { L: number[]; R: number[] } }> = {
  f1: { L: [7, 5, 7, 7], R: [6, 7, 7, 7], zoom: { L: [0.86, 1, 1, 1], R: [1.14, 1, 1, 1] } },
};

export default function SportFigures({ sport }: { sport: string }) {
  const set = SETS[sport];
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!set || !root.current) return;
    const el = root.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const src = (side: Side, s: number, f: number) => `/vizuali/${sport}/${side}${s}-${f}.webp`;

    // unapred učitaj sve frejmove da blic ne čeka mrežu
    (['L', 'R'] as Side[]).forEach((side) => set[side].forEach((n, s) => { for (let f = 0; f < n; f++) { const i = new Image(); i.src = src(side, s, f); } }));

    const parts = (['L', 'R'] as Side[]).map((side) => {
      const box = el.querySelector<HTMLDivElement>(`[data-side="${side}"]`)!;
      return { side, img: box.querySelector('img')!, timer: 0 as unknown as ReturnType<typeof setTimeout> | 0 };
    });

    // bez blica: frejmovi se samo smenjuju, kao serija fotki
    const show = (p: (typeof parts)[number], s: number, f: number, _quiet = false) => {
      p.img.src = src(p.side, s, f);
      p.img.style.transform = `scale(${set.zoom?.[p.side][s] ?? 1})`;
    };
    const burst = (p: (typeof parts)[number], s: number) => {
      if (p.timer) clearTimeout(p.timer);
      const n = set[p.side][s];
      const seq = [...Array(n - 1)].map((_, i) => i + 1).concat([0]);
      let k = 0;
      const step = () => {
        show(p, s, seq[k]);
        k++;
        if (k < seq.length) p.timer = setTimeout(step, k === seq.length - 1 ? 260 : 170);
        else p.timer = 0;
      };
      if (reduce) show(p, s, 0, true);
      else step();
    };

    const scenes = Math.min(set.L.length, set.R.length);
    let cur = -1;
    const onScroll = () => {
      const hero = document.querySelector('.hero-shop');
      const start = hero ? hero.getBoundingClientRect().bottom + window.scrollY - window.innerHeight * 0.4 : 0;
      const end = document.documentElement.scrollHeight - window.innerHeight * 1.6;
      const y = window.scrollY;
      // likovi se vide tek ispod hero dela i nestaju pred futerom
      el.classList.toggle('on', y > start && y < end + window.innerHeight * 0.4);
      const t = Math.max(0, Math.min(0.999, (y - start) / Math.max(1, end - start)));
      const s = Math.floor(t * scenes);
      if (s === cur) return;
      const first = cur === -1;
      cur = s;
      if (first) {
        parts.forEach((p) => show(p, s, 0, true));
        return;
      }
      burst(parts[0], s);
      setTimeout(() => burst(parts[1], s), 480);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      parts.forEach((p) => p.timer && clearTimeout(p.timer));
    };
  }, [sport, set]);

  if (!set) return null;
  return (
    <div ref={root} className="sport-figs" aria-hidden="true">
      {(['L', 'R'] as Side[]).map((side) => (
        <div key={side} className={'sf sf-' + side} data-side={side}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/vizuali/${sport}/${side}0-0.webp`} alt="" decoding="async" style={{ transform: `scale(${set.zoom?.[side][0] ?? 1})` }} />
        </div>
      ))}
    </div>
  );
}
