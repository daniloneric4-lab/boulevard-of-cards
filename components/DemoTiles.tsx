import Link from 'next/link';
import CardArt from './CardArt';
import { DEMO_CARDS } from '@/lib/demo';
import { sportLabel } from '@/lib/format';

export default function DemoTiles({ sport, count = 4, mode, cta = 'Postavi svoju', href = '/prodaj' }: { sport?: string; count?: number; mode?: string; cta?: string; href?: string }) {
  let list = DEMO_CARDS.filter((d) => (!sport || d.sport === sport) && (!mode || d.mode === mode));
  if (list.length < count) list = [...list, ...DEMO_CARDS.filter((d) => !list.includes(d))];
  return (
    <div className="stack">
      <span className="muted" style={{ fontSize: 13 }}>
        Još nema pravih oglasa, ovako će izgledati. Primeri nisu na prodaju.
      </span>
      <div className="grid-tiles">
        {list.slice(0, count).map((d) => (
          <article key={d.id} className="tile" style={{ opacity: 0.92 }}>
            <div className="tile-media">
              <CardArt seed={d.id} grade={d.grade} />
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
