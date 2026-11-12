import Link from 'next/link';
import type { Metadata } from 'next';
import { getSessionInfo } from '@/lib/supabase/server';
import PageHero from '@/components/PageHero';
import ListingTile from '@/components/ListingTile';
import Empty from '@/components/Empty';
import DemoTiles from '@/components/DemoTiles';
import { SPORTS } from '@/lib/format';
import { LISTING_SELECT, one, type ListingRow } from '@/lib/listings';

export const metadata: Metadata = { title: 'Aukcije' };
export const dynamic = 'force-dynamic';

export default async function Auctions({ searchParams }: { searchParams: Promise<{ sport?: string; sort?: string; view?: string }> }) {
  const { sport, sort = 'end', view = 'all' } = await searchParams;
  const { supabase, user } = await getSessionInfo();
  await supabase.rpc('settle_auctions');
  let q = supabase.from('listings').select(LISTING_SELECT).eq('mode', 'auction').eq('status', 'active');
  if (sport && SPORTS.some((s) => s.key === sport)) q = q.eq('sport', sport);
  const { data } = await q.limit(120);
  let list = (data ?? []) as unknown as ListingRow[];
  if (user && view === 'watch') {
    const { data: w } = await supabase.from('listing_watches').select('listing_id').eq('user_id', user.id);
    const ids = new Set((w ?? []).map((x) => x.listing_id));
    list = list.filter((l) => ids.has(l.id));
  }
  if (user && view === 'mine') list = list.filter((l) => one(l.auctions)?.current_bidder_id === user.id || l.seller_id === user.id);
  const end = (l: ListingRow) => new Date(one(l.auctions)?.ends_at ?? 0).getTime();
  list.sort((a, b) => (sort === 'bids' ? (one(b.auctions)?.bid_count ?? 0) - (one(a.auctions)?.bid_count ?? 0) : sort === 'new' ? +new Date(b.created_at) - +new Date(a.created_at) : end(a) - end(b)));
  const qs = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const m = { sport, sort, view, ...p };
    Object.entries(m).forEach(([k, v]) => v && v !== 'all' && !(k === 'sort' && v === 'end') && u.set(k, v));
    const s = u.toString();
    return `/aukcije${s ? '?' + s : ''}`;
  };

  return (
    <>
      <PageHero
        title="Aukcije"
        video={sport && ['football', 'f1', 'nba', 'nfl'].includes(sport) ? sport : 'all'}
        badge={
          <>
            <span className="live-dot" style={{ background: '#fff' }} /> {list.length} AUKCIJA UŽIVO
          </>
        }
        lead="Ponuda u poslednja 2 minuta produžava aukciju, pa niko ne može da ukrade karticu u zadnjoj sekundi."
      >
        <div className="chips" role="tablist" aria-label="Prikaz">
          {[
            ['all', 'Sve'],
            ['watch', 'Pratim'],
            ['mine', 'Moje ponude'],
          ].map(([k, l]) => (
            <Link key={k} href={qs({ view: k })} role="tab" aria-selected={view === k} className={'chip' + (view === k ? ' on' : '')} style={view === k ? { background: '#fff', color: 'var(--bc-carbon)' } : { background: 'transparent', color: '#fff', borderColor: 'var(--bc-line-dk)' }}>
              {l}
            </Link>
          ))}
        </div>
      </PageHero>
      <div className="page">
        <div className="row between">
          <div className="chips">
            <Link href={qs({ sport: undefined })} className={'chip' + (!sport ? ' on' : '')}>
              Sve
            </Link>
            {SPORTS.map((s) => (
              <Link key={s.key} href={qs({ sport: s.key })} className={'chip' + (sport === s.key ? ' on' : '')}>
                {s.label}
              </Link>
            ))}
          </div>
          <div className="chips" aria-label="Sortiraj">
            {[
              ['end', 'Završava se uskoro'],
              ['bids', 'Najviše ponuda'],
              ['new', 'Najnovije'],
            ].map(([k, l]) => (
              <Link key={k} href={qs({ sort: k })} className={'chip' + (sort === k ? ' on' : '')} style={{ minHeight: 36, fontSize: 13 }}>
                {l}
              </Link>
            ))}
          </div>
        </div>
        {list.length ? (
          <div className="grid-tiles">
            {list.map((l) => (
              <ListingTile key={l.id} l={l} />
            ))}
          </div>
        ) : view === 'all' ? (
          <DemoTiles sport={sport} mode="Aukcija" cta="Postavi aukciju" href="/prodaj?mode=auction" />
        ) : (
          <Empty
            title={view === 'watch' ? 'Ne pratiš nijednu aukciju' : view === 'mine' ? 'Nemaš aktivnih ponuda' : 'Trenutno nema aktivnih aukcija'}
            text="Imaš karticu vrednu licitiranja? Postavi aukciju za minut."
            href="/prodaj?mode=auction"
            cta="Postavi aukciju"
          />
        )}
      </div>
    </>
  );
}
