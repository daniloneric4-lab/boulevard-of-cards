import { artFor } from './CardArt';

// Kutija na istoj tamnoj pozadini kao kartice: prava slika kutije ili generisana kutija (bez logotipa).
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
  const w = size === 'lg' ? 280 : size === 'sm' ? 92 : 132;
  return (
    <div className={'slab-stage slab-' + size} aria-hidden={label ? undefined : 'true'} role={label ? 'img' : undefined} aria-label={label}>
      <div className="box3d" style={{ width: w, height: Math.round(w * 1.12) }}>
        {image ? (
          <div className="box3d-front box3d-photo">
            <img src={image} alt="" />
            <div className="boc-shine" />
          </div>
        ) : (
          <div className="box3d-front" style={{ background: artFor(seed + 'box') }}>
            <span className="box3d-brand">TOPPS</span>
            <span className="box3d-name">{name}</span>
            <span className="box3d-format">{format}</span>
            <div className="boc-shine" />
          </div>
        )}
        <div className="box3d-side" />
        <div className="box3d-top" />
      </div>
    </div>
  );
}
