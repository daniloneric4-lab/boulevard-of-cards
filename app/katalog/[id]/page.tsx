import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionInfo } from '@/lib/supabase/server';
import CardArt from '@/components/CardArt';
import ListingTile from '@/components/ListingTile';
import WishForm from '@/components/WishForm';
import SubmitButton from '@/components/SubmitButton';
import { addCatalogToCollection } from '@/app/_act/market';
import { date, money, sportLabel } from '@/lib/format';
import { LISTING_SELECT, type ListingRow } from '@/lib/listings';

export const dynamic = 'force-dynamic';

export default async function CatalogCard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionInfo();
  const { data: c } = await supabase.from('card_catalog').select('*').eq('id', id).maybeSingle();
  if (!c) notFound();
  const [{ data: active }, { data: sold }, have] = await Promise.all([
    supabase.from('listings').select(LISTING_SELECT).eq('catalog_id', id).eq('status', 'active').limit(12),
    supabase.from('listings').select('id, title, price_cents, currency, updated_at').eq('catalog_id', id).eq('status', 'sold').order('updated_at', { ascending: false }).limit(10),
    user ? supabase.from('collection_items').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).eq('catalog_id', id) : Promise.resolve({ count: 0 }),
  ]);
  const title = `${c.player}${c.parallel ? ' · ' + c.parallel : ''}${c.print_run ? ' /' + c.print_run : ''}`;
  const prices = (sold ?? []).map((s) => s.price_cents ?? 0).filter(Boolean);
  const avg = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;

  return (
    <div className="page">
      <Link href="/katalog" className="lnk">
        ← Katalog
      </Link>
      <div className="two">
        <CardArt seed={c.id} grade={c.is_autograph ? 'AUTO' : c.is_rookie ? 'RC' : 'BASE'} size="lg" image={c.image_url} label={title} />
        <div className="stack" style={{ gap: 18 }}>
          <span className="kicker">
            {sportLabel(c.sport)} · {c.year} {c.set_name}
          </span>
          <h1 style={{ fontSize: 'clamp(28px,4vw,46px)' }}>{title}</h1>
          <div className="kv">
            <div>
              <span>Broj</span>
              <b>{c.card_number ? '#' + c.card_number : '—'}</b>
            </div>
            <div>
              <span>Tim</span>
              <b style={{ fontSize: 16 }}>{c.team || '—'}</b>
            </div>
            <div>
              <span>Tiraž</span>
              <b>{c.print_run ? '/' + c.print_run : '—'}</b>
            </div>
            <div>
              <span>Prosek prodaja</span>
              <b style={{ fontSize: 16 }}>{avg ? money(avg) : '—'}</b>
            </div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            {c.is_rookie ? <span className="pill pill-red">ROOKIE</span> : null}
            {c.is_autograph ? <span className="pill pill-dark">AUTOGRAM</span> : null}
          </div>
          <div className="card stack">
            <h3>Imaš je ili je tražiš?</h3>
            <WishForm catalogId={c.id} query={title} />
            {user ? (
              (have.count ?? 0) > 0 ? (
                <span className="pill pill-green" style={{ alignSelf: 'flex-start' }}>
                  U tvojoj kolekciji
                </span>
              ) : (
                <form action={addCatalogToCollection}>
                  <input type="hidden" name="catalog_id" value={c.id} />
                  <SubmitButton className="btn btn-ghost">Imam je · dodaj u kolekciju</SubmitButton>
                </form>
              )
            ) : null}
            <Link href={`/prodaj?title=${encodeURIComponent(`${c.year} ${c.set_name} · ${title}`)}&sport=${c.sport}`} className="lnk">
              Prodaj svoju →
            </Link>
          </div>
        </div>
      </div>
      <section className="stack">
        <h2>Na prodaji sada</h2>
        {active && active.length ? (
          <div className="grid-tiles">
            {(active as unknown as ListingRow[]).map((l) => (
              <ListingTile key={l.id} l={l} />
            ))}
          </div>
        ) : (
          <div className="alert alert-info">Trenutno niko ne prodaje ovu karticu. Dodaj je na listu želja i javićemo ti.</div>
        )}
      </section>
      <section className="stack">
        <h2>Prodaje na bulevaru</h2>
        {sold && sold.length ? (
          <div className="list">
            {sold.map((s) => (
              <div key={s.id} className="list-row">
                <span style={{ flex: 1 }}>{s.title}</span>
                <b className="mono">{money(s.price_cents, s.currency)}</b>
                <span className="mono muted">{date(s.updated_at)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="alert alert-info">Prave vrednosti se pojavljuju posle prvih prodaja.</div>
        )}
      </section>
    </div>
  );
}
