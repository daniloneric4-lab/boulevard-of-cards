// Generisana kartica u kucistu (slab), kao u prototipu. Bez pravih slika i logotipa.
const ARTS = [
  'linear-gradient(150deg, var(--bc-red-dk), var(--bc-carbon))',
  'linear-gradient(150deg, var(--bc-surface), var(--bc-red-dk))',
  'linear-gradient(150deg, var(--bc-red-dk), var(--bc-carbon) 70%)',
  'linear-gradient(150deg, var(--bc-surface), var(--bc-gray))',
  'linear-gradient(150deg, var(--bc-carbon), var(--bc-gray))',
  'linear-gradient(150deg, var(--bc-red), var(--bc-carbon))',
  'linear-gradient(150deg, var(--bc-gray), var(--bc-carbon))',
  'linear-gradient(150deg, var(--bc-carbon), var(--bc-red-dk))',
];

export function artFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ARTS[h % ARTS.length];
}

export default function CardArt({
  seed,
  grade = 'RAW',
  image,
  size = 'md',
  label,
}: {
  seed: string;
  grade?: string;
  image?: string | null;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}) {
  const w = size === 'lg' ? 240 : size === 'sm' ? 84 : 112;
  return (
    <div className={'slab-stage slab-' + size} aria-hidden={label ? undefined : 'true'} role={label ? 'img' : undefined} aria-label={label}>
      <div className="slab" style={{ width: w, height: Math.round(w * 1.57) }}>
        <div className="slab-top">
          <span>TOPPS</span>
          <b>{grade}</b>
        </div>
        <div className="slab-art" style={{ background: image ? undefined : artFor(seed) }}>
          {image ? <img src={image} alt="" /> : null}
          <div className="boc-shine" />
        </div>
      </div>
    </div>
  );
}
