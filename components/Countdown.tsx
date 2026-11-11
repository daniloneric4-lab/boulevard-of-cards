'use client';
import { useEffect, useState } from 'react';

function parts(end: number) {
  const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60, done: s === 0 };
}
const pad = (n: number) => String(n).padStart(2, '0');

export default function Countdown({ to, compact = false }: { to: string; compact?: boolean }) {
  const end = new Date(to).getTime();
  const [p, setP] = useState<ReturnType<typeof parts> | null>(null);
  useEffect(() => {
    setP(parts(end));
    const t = setInterval(() => setP(parts(end)), 1000);
    return () => clearInterval(t);
  }, [end]);
  if (!p) return <span className="mono">—</span>;
  if (p.done) return <span className="mono">Završeno</span>;
  if (compact) return <span className="mono">{p.d > 0 ? `${p.d}d ${p.h}h` : p.h > 0 ? `${p.h}h ${pad(p.m)}m` : `${pad(p.m)}:${pad(p.s)}`}</span>;
  return (
    <span className="cd" role="timer">
      {[
        [p.d, 'dana'],
        [p.h, 'sati'],
        [p.m, 'min'],
        [p.s, 'sek'],
      ].map(([v, l]) => (
        <span key={l as string} className="cd-box">
          <b className="mono">{pad(v as number)}</b>
          <small>{l}</small>
        </span>
      ))}
    </span>
  );
}
