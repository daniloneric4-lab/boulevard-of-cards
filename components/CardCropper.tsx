'use client';
import { useEffect, useRef, useState } from 'react';

type Pt = { x: number; y: number };
type Quad = [Pt, Pt, Pt, Pt]; // gore levo, gore desno, dole desno, dole levo

const RATIOS: { key: string; label: string; r: number | null }[] = [
  { key: 'card', label: 'Kartica', r: 2.5 / 3.5 },
  { key: 'slab', label: 'Slab (PSA, BGS…)', r: 0.58 },
  { key: 'free', label: 'Kutija / slobodno', r: null },
];

// --- automatsko pronalaženje kartice: boja pozadine sa ivica slike, pa najveća "drugačija" oblast ---
function detect(img: ImageData): Quad | null {
  const { width: w, height: h, data } = img;
  const px = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  // pozadina = medijana piksela sa okvira slike
  const border: number[][] = [];
  const band = Math.max(2, Math.round(Math.min(w, h) * 0.03));
  for (let x = 0; x < w; x += 2) for (let b = 0; b < band; b++) border.push(px(x, b), px(x, h - 1 - b));
  for (let y = 0; y < h; y += 2) for (let b = 0; b < band; b++) border.push(px(b, y), px(w - 1 - b, y));
  const med = [0, 1, 2].map((c) => {
    const v = border.map((p) => p[c]).sort((a, b) => a - b);
    return v[v.length >> 1];
  });
  // ivice (gradijent) + razlika od pozadine
  const mask = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const [r, g, b] = px(x, y);
      const d = Math.abs(r - med[0]) + Math.abs(g - med[1]) + Math.abs(b - med[2]);
      if (d > 70) mask[y * w + x] = 1;
    }
  // očisti šum: piksel ostaje samo ako je većina suseda takođe "kartica"
  const clean = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += mask[(y + dy) * w + x + dx];
      if (n >= 7) clean[y * w + x] = 1;
    }
  // najduži niz redova/kolona sa dovoljno "kartice"
  const run = (vals: number[], min: number) => {
    let best: [number, number] = [0, -1];
    let s = -1;
    vals.forEach((v, i) => {
      if (v >= min) {
        if (s < 0) s = i;
        if (i - s > best[1] - best[0]) best = [s, i];
      } else s = -1;
    });
    return best;
  };
  const rows = Array.from({ length: h }, (_, y) => {
    let c = 0;
    for (let x = 0; x < w; x++) c += clean[y * w + x];
    return c / w;
  });
  const [y0, y1] = run(rows, 0.12);
  const cols = Array.from({ length: w }, (_, x) => {
    let c = 0;
    for (let y = y0; y <= y1; y++) c += clean[y * w + x];
    return c / Math.max(1, y1 - y0 + 1);
  });
  const [x0, x1] = run(cols, 0.12);
  const area = ((x1 - x0) * (y1 - y0)) / (w * h);
  if (x1 <= x0 || y1 <= y0 || area < 0.08 || area > 0.985) return null;
  // ćoškovi i za ukošenu karticu: krajnje tačke po x+y i x−y unutar pronađene oblasti
  let tl: Pt = { x: x0, y: y0 }, tr: Pt = { x: x1, y: y0 }, br: Pt = { x: x1, y: y1 }, bl: Pt = { x: x0, y: y1 };
  let mTl = Infinity, mTr = -Infinity, mBr = -Infinity, mBl = Infinity;
  // ukošena kartica viri malo van pronađenih redova/kolona, pa tražimo i malo šire
  const mx = Math.round((x1 - x0) * 0.12), my = Math.round((y1 - y0) * 0.12);
  for (let y = Math.max(1, y0 - my); y <= Math.min(h - 2, y1 + my); y++)
    for (let x = Math.max(1, x0 - mx); x <= Math.min(w - 2, x1 + mx); x++) {
      if (!clean[y * w + x]) continue;
      if (x + y < mTl) (mTl = x + y), (tl = { x, y });
      if (x - y > mTr) (mTr = x - y), (tr = { x, y });
      if (x + y > mBr) (mBr = x + y), (br = { x, y });
      if (x - y < mBl) (mBl = x - y), (bl = { x, y });
    }
  return [tl, tr, br, bl];
}

// --- perspektiva: matrica koja pravougaonik izlaza preslikava na četvorougao na slici ---
function homography(src: Pt[], dst: Pt[]) {
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
    }
  }
  const h = A.map((row, i) => row[8] / row[i]);
  return [...h, 1];
}

function warp(srcImg: ImageData, q: Quad, outW: number, outH: number): ImageData {
  const H = homography(
    [
      { x: 0, y: 0 },
      { x: outW, y: 0 },
      { x: outW, y: outH },
      { x: 0, y: outH },
    ],
    q,
  );
  const out = new ImageData(outW, outH);
  const { width: sw, height: sh, data: s } = srcImg;
  const o = out.data;
  for (let y = 0; y < outH; y++)
    for (let x = 0; x < outW; x++) {
      const d = H[6] * x + H[7] * y + H[8];
      const u = (H[0] * x + H[1] * y + H[2]) / d;
      const v = (H[3] * x + H[4] * y + H[5]) / d;
      const x0 = Math.max(0, Math.min(sw - 2, Math.floor(u)));
      const y0 = Math.max(0, Math.min(sh - 2, Math.floor(v)));
      const fx = Math.min(1, Math.max(0, u - x0));
      const fy = Math.min(1, Math.max(0, v - y0));
      const i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
      const j = (y * outW + x) * 4;
      for (let c = 0; c < 3; c++)
        o[j + c] = (s[i00 + c] * (1 - fx) + s[i10 + c] * fx) * (1 - fy) + (s[i01 + c] * (1 - fx) + s[i11 + c] * fx) * fy;
      o[j + 3] = 255;
    }
  return out;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Isecanje kartice sa fotografije: sajt sam nađe karticu i ukloni pozadinu,
 * a korisnik po potrebi pomeri ćoškove. Rezultat je ravna kartica koja lepo stoji u okviru na sajtu.
 */
export default function CardCropper({
  file,
  defaultRatio = 'card',
  onDone,
  onSkip,
}: {
  file: File;
  defaultRatio?: 'card' | 'slab' | 'free';
  onDone: (blob: Blob, url: string) => void;
  onSkip: () => void;
}) {
  const [src, setSrc] = useState<ImageData | null>(null);
  const [url, setUrl] = useState('');
  const [quad, setQuad] = useState<Quad | null>(null);
  const [found, setFound] = useState(true);
  const [ratio, setRatio] = useState(defaultRatio);
  const [busy, setBusy] = useState(false);
  const drag = useRef<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    const u = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      if (!live) return;
      const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * k);
      c.height = Math.round(im.naturalHeight * k);
      const ctx = c.getContext('2d')!;
      ctx.drawImage(im, 0, 0, c.width, c.height);
      const full = ctx.getImageData(0, 0, c.width, c.height);
      // traženje na umanjenoj slici (brže), pa ćoškove vratimo na punu veličinu
      const s = Math.min(1, 420 / Math.max(c.width, c.height));
      const t = document.createElement('canvas');
      t.width = Math.round(c.width * s);
      t.height = Math.round(c.height * s);
      t.getContext('2d')!.drawImage(c, 0, 0, t.width, t.height);
      const q = detect(t.getContext('2d')!.getImageData(0, 0, t.width, t.height));
      const pad = 0.06;
      const fallback: Quad = [
        { x: c.width * pad, y: c.height * pad },
        { x: c.width * (1 - pad), y: c.height * pad },
        { x: c.width * (1 - pad), y: c.height * (1 - pad) },
        { x: c.width * pad, y: c.height * (1 - pad) },
      ];
      setFound(!!q);
      setQuad(q ? (q.map((p) => ({ x: p.x / s, y: p.y / s })) as Quad) : fallback);
      setSrc(full);
      setUrl(c.toDataURL('image/jpeg', 0.9));
    };
    im.src = u;
    return () => {
      live = false;
      URL.revokeObjectURL(u);
    };
  }, [file]);

  const toImg = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * src!.width, y: ((e.clientY - r.top) / r.height) * src!.height };
  };

  const cut = async () => {
    if (!src || !quad) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 20));
    const qw = (dist(quad[0], quad[1]) + dist(quad[3], quad[2])) / 2;
    const qh = (dist(quad[0], quad[3]) + dist(quad[1], quad[2])) / 2;
    const r = RATIOS.find((x) => x.key === ratio)?.r ?? qw / qh;
    const outH = Math.min(1200, Math.max(400, Math.round(qh)));
    const outW = Math.round(outH * r);
    const img = warp(src, quad, outW, outH);
    const c = document.createElement('canvas');
    c.width = outW;
    c.height = outH;
    c.getContext('2d')!.putImageData(img, 0, 0);
    c.toBlob(
      (b) => {
        setBusy(false);
        if (b) onDone(b, URL.createObjectURL(b));
      },
      'image/jpeg',
      0.9,
    );
  };

  if (!src || !quad) return <div className="card muted">Tražim karticu na slici…</div>;
  const pts = quad.map((p) => `${(p.x / src.width) * 100},${(p.y / src.height) * 100}`).join(' ');

  return (
    <div className="card stack cropper" style={{ gap: 12 }}>
      <b>{found ? 'Našli smo karticu. Pomeri ćoškove ako treba.' : 'Prevuci ćoškove na ćoškove kartice.'}</b>
      <div
        ref={box}
        className="cropper-box"
        style={{ aspectRatio: `${src.width} / ${src.height}` }}
        onPointerMove={(e) => {
          if (drag.current == null) return;
          const p = toImg(e);
          const q = [...quad] as Quad;
          q[drag.current] = { x: Math.max(0, Math.min(src.width, p.x)), y: Math.max(0, Math.min(src.height, p.y)) };
          setQuad(q);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
      >
        <img src={url} alt="Fotografija kartice" draggable={false} />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <mask id="crop-hole">
              <rect width="100" height="100" fill="#fff" />
              <polygon points={pts} fill="#000" />
            </mask>
          </defs>
          <rect width="100" height="100" fill="rgba(0,0,0,.55)" mask="url(#crop-hole)" />
          <polygon points={pts} fill="none" stroke="#e10600" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        </svg>
        {quad.map((p, i) => (
          <button
            key={i}
            type="button"
            className="cropper-dot"
            style={{ left: `${(p.x / src.width) * 100}%`, top: `${(p.y / src.height) * 100}%` }}
            aria-label={['Gornji levi ćošak', 'Gornji desni ćošak', 'Donji desni ćošak', 'Donji levi ćošak'][i]}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = i;
            }}
            onPointerMove={(e) => {
              if (drag.current !== i) return;
              const pt = toImg(e);
              const q = [...quad] as Quad;
              q[i] = { x: Math.max(0, Math.min(src.width, pt.x)), y: Math.max(0, Math.min(src.height, pt.y)) };
              setQuad(q);
            }}
            onPointerUp={() => (drag.current = null)}
          />
        ))}
      </div>
      <div className="chips" role="radiogroup" aria-label="Oblik">
        {RATIOS.map((r) => (
          <button key={r.key} type="button" role="radio" aria-checked={ratio === r.key} className={'chip' + (ratio === r.key ? ' on' : '')} onClick={() => setRatio(r.key as typeof ratio)}>
            {r.label}
          </button>
        ))}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-red" onClick={cut} disabled={busy}>
          {busy ? 'Isecam…' : 'Iseci i koristi'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onSkip} disabled={busy}>
          Koristi celu sliku
        </button>
      </div>
    </div>
  );
}
