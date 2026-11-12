import { artFor } from './CardArt';

// Kutija u istom okviru kao kartica: beli okvir sa natpisom, unutra slika kutije na tamnoj pozadini.
export default function BoxArt({
  seed,
  name = 'TOPPS',
  format = 'HOBBY BOX',
  image,
  size = 'md',
  label,
}: {
  seed: string;
  name?: string;
  format?: string;
  image?: string | null;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}) {
  const w = size === 'lg' ? 300 : size === 'sm' ? 100 : 150;
  return (
    <div className={'slab-stage slab-' + size} aria-hidden={label ? undefined : 'true'} role={label ? 'img' : undefined} aria-label={label}>
      <div className="slab box-slab" style={{ width: w, height: Math.round(w * 1.18) }}>
        <div className="slab-top">
          <span>TOPPS</span>
          <b>BOX</b>
        </div>
        <div className="slab-art box-art" style={{ background: image ? '#0d0d12' : artFor(seed + 'box') }}>
          {image ? (
            <img src={image} alt="" />
          ) : (
            <span className="box-gen">
              <b>{name}</b>
              <small>{format}</small>
            </span>
          )}
          <div className="boc-shine" />
        </div>
      </div>
    </div>
  );
}
