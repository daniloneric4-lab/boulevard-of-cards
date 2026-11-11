import Link from 'next/link';
import CardArt from './CardArt';
import { gradeLabel, listingImage, money, sportLabel, timeLeft, LISTING_MODE } from '@/lib/format';
import { one, type ListingRow } from '@/lib/listings';

export default function ListingTile({ l }: { l: ListingRow }) {
  const a = one(l.auctions);
  const ci = one(l.collection_items);
  const seller = one(l.seller);
  const img = (l.listing_images ?? []).sort((x, y) => x.position - y.position)[0];
  const price = a ? a.current_bid_cents ?? a.start_price_cents : l.price_cents;
  const sold = l.status !== 'active';
  return (
    <article className="tile">
      <Link href={`/oglas/${l.id}`} className="tile-media" aria-label={l.title} style={{ textDecoration: 'none' }}>
        <CardArt seed={l.id} grade={gradeLabel(ci?.grader, ci?.grade)} image={listingImage(img?.storage_path)} />
        <span className="tile-tag">{sportLabel(l.sport)}</span>
        {a && !sold ? <span className="tile-time">{timeLeft(a.ends_at)}</span> : null}
        {sold ? <span className="tile-time" style={{ background: 'var(--bc-gray)' }}>{l.status === 'sold' ? 'Prodato' : l.status === 'reserved' ? 'Rezervisano' : 'Završeno'}</span> : null}
      </Link>
      <div className="tile-body">
        {l.is_official ? <span className="pill pill-red" style={{ alignSelf: 'flex-start' }}>ZVANIČNO</span> : null}
        <Link href={`/oglas/${l.id}`} className="tile-title" style={{ textDecoration: 'none' }}>
          {l.title}
        </Link>
        {seller ? (
          <Link href={`/u/${seller.username}`} className="lnk" style={{ fontSize: 13 }}>
            @{seller.username}
            {seller.is_verified ? ' ✓' : ''}
            {l.city ? <span className="muted" style={{ fontWeight: 400 }}> · {l.city}</span> : null}
          </Link>
        ) : null}
        <span className="muted" style={{ fontSize: 13 }}>
          {a ? `${a.bid_count} ${a.bid_count === 1 ? 'ponuda' : 'ponuda'}` : LISTING_MODE[l.mode]}
        </span>
        <div className="tile-foot">
          <span className="tile-price">{l.mode === 'showcase' || l.mode === 'trade' ? '—' : money(price, l.currency)}</span>
          <Link href={`/oglas/${l.id}`} className="btn btn-sm btn-dark">
            {a ? 'Licitiraj' : l.mode === 'fixed' ? 'Kupi' : l.mode === 'trade' ? 'Ponudi razmenu' : l.mode === 'showcase' ? 'Pogledaj' : 'Ponudi'}
          </Link>
        </div>
      </div>
    </article>
  );
}
