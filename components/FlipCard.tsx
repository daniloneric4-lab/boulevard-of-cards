'use client';
import { useRef, useState } from 'react';
import { artFor } from './CardArt';

export default function FlipCard({
  seed,
  grade,
  image,
  title,
  back,
}: {
  seed: string;
  grade: string;
  image?: string | null;
  title: string;
  back: { label: string; value: string }[];
}) {
  const [flipped, setFlipped] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, gx: 50, gy: 30 });
  const move = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || e.pointerType === 'touch') return;
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({ x: (0.5 - py) * 14, y: (px - 0.5) * 18, gx: px * 100, gy: py * 100 });
  };
  const reset = () => setTilt({ x: 0, y: 0, gx: 50, gy: 30 });
  return (
    <div className="flip-wrap stack" style={{ gap: 14 }}>
      <div className="slab-stage slab-lg" ref={ref} onPointerMove={move} onPointerLeave={reset}>
        <div
          className={'flip' + (flipped ? ' is-flipped' : '')}
          style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y + (flipped ? 180 : 0)}deg)` }}
          role="img"
          aria-label={flipped ? `${title}, zadnja strana` : title}
        >
          <div className="flip-face slab" style={{ width: 240, height: 377 }}>
            <div className="slab-top">
              <span>TOPPS</span>
              <b>{grade}</b>
            </div>
            <div className="slab-art" style={{ background: image ? undefined : artFor(seed) }}>
              {image ? <img src={image} alt="" /> : null}
              <div className="flip-glare" style={{ background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,.45), rgba(255,255,255,0) 45%)` }} />
              <div className="boc-shine" />
            </div>
          </div>
          <div className="flip-face flip-back slab" style={{ width: 240, height: 377 }}>
            <div className="slab-top">
              <span>BOULEVARD OF CARDS</span>
              <b>{grade}</b>
            </div>
            <div className="flip-back-body">
              <img src="/boc-b.png" alt="" style={{ width: 54, opacity: 0.9 }} />
              <b style={{ fontSize: 13, lineHeight: 1.3 }}>{title}</b>
              <dl>
                {back.map((b) => (
                  <div key={b.label}>
                    <dt>{b.label}</dt>
                    <dd>{b.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFlipped((f) => !f)} aria-pressed={flipped}>
          {flipped ? 'Prednja strana' : 'Okreni karticu'}
        </button>
        <span className="muted" style={{ fontSize: 12 }}>Pomeri miš preko kartice</span>
      </div>
    </div>
  );
}
