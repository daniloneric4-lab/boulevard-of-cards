import Link from 'next/link';
import CardArt from './CardArt';
import BoxArt from './BoxArt';
import { DEMO_BOXES, DEMO_CARDS } from '@/lib/demo';
import { sportLabel } from '@/lib/format';

type Demo = { id: string; title: string; sport: string; mode: string; grade?: string; name?: string; format?: string; box?: boolean };

export default function DemoTiles({
  sport,
  count = 4,
  mode,
  cta = 'Postavi svoju',
  href = '/prodaj',
  kind = 'all',
}: {
  sport?: string;
  count?: number;
  mode?: string;
  cta?: string;
  href?: string;
  /** 'cards' samo kartice, 'boxes' samo kutije, 'all' i jedno i drugo */
  kind?: 'cards' | 'boxes' | 'all';
}) {
  const pick = (src: Demo[], n: number) => {
    let list = src.filter((d) => (!sport || d.sport === sport) && (!mode || d.mode === mode));
    if (list.length < n) list = [...list, ...src.filter((d) => !list.includes(d))];
    return list.slice(0, n);
  };
  const cards = kind === 'boxes' ? [] : pick(DEMO_CARDS, count);
  const boxes = kind === 'cards' ? [] : pick(DEMO_BOXES.map((b) => ({ ...b, box: true })), count);
  return (
    <div className="stack">
      <span className="muted" style={{ fontSize: 13 }}>
        Još nema pravih oglasa, ovako će izgledati. Primeri nisu na prodaju.
      </span>
      <div className="grid-tiles">
        {[...cards, ...boxes].map((d: Demo) => (
          <article key={d.id} className="tile" style={{ opacity: 0.92 }}>
            <div className="tile-media">
              {d.box ? <BoxArt seed={d.id} name={d.name} format={d.format} /> : <CardArt seed={d.id} grade={d.grade} />}
              <span className="tile-tag">{sportLabel(d.sport)}</span>
              <span className="demo-tag">PRIMER</span>
            </div>
            <div className="tile-body">
              <span className="tile-title">{d.title}</span>
              <span className="muted" style={{ fontSize: 13 }}>
                {d.mode}
              </span>
              <div className="tile-foot">
                <span className="tile-price muted" style={{ fontSize: 14 }}>
                  primer
                </span>
                <Link href={href} className="btn btn-sm btn-dark">
                  {cta}
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
