import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import ProductCard, { type Product } from '@/components/ProductCard';
import { SPORTS } from '@/lib/format';

export const metadata: Metadata = { title: 'Prodavnica' };
export const dynamic = 'force-dynamic';

export default async function Shop({ searchParams }: { searchParams: Promise<{ sport?: string; q?: string }> }) {
  const { sport, q } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from('products')
    .select('id, name, kind, sport, mode, price_cents, currency, stock, low_stock_at, image_path, description')
    .eq('is_visible', true)
    .order('mode', { ascending: true })
    .order('created_at', { ascending: false });
  if (sport && SPORTS.some((s) => s.key === sport)) query = query.eq('sport', sport);
  if (q) query = query.ilike('name', `%${q.replace(/[%_]/g, '')}%`);
  const { data: products, error } = await query;

  return (
    <div className="wrap section stack" style={{ gap: 24 }}>
      <div className="stack" style={{ gap: 8 }}>
        <span className="kicker">Zvanična prodavnica</span>
        <h1 style={{ fontSize: 'clamp(28px,4vw,44px)' }}>Prodavnica</h1>
        <p className="muted">Topps kutije i oprema koje prodaje Boulevard of Cards. Plaćanje uplatom, IPS-om ili pouzećem.</p>
      </div>

      <form className="row" action="/prodavnica" role="search">
        {sport ? <input type="hidden" name="sport" value={sport} /> : null}
        <label className="fld" style={{ flex: '1 1 260px' }}>
          <span className="sr" style={{ position: 'absolute', left: -9999 }}>
            Pretraga
          </span>
          <input className="inp" name="q" defaultValue={q ?? ''} placeholder="Traži kutiju, set, igrača…" />
        </label>
        <button className="btn btn-dark">Traži</button>
      </form>

      <div className="chips" aria-label="Sport">
        <Link href="/prodavnica" className={'chip' + (!sport ? ' on' : '')}>
          Sve
        </Link>
        {SPORTS.map((s) => (
          <Link key={s.key} href={`/prodavnica?sport=${s.key}`} className={'chip' + (sport === s.key ? ' on' : '')}>
            {s.label}
          </Link>
        ))}
      </div>

      {error ? <div className="alert alert-err">Prodavnica trenutno ne može da se učita.</div> : null}
      {products && products.length ? (
        <div className="grid">
          {(products as Product[]).map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <div className="alert alert-info">Nema proizvoda za ovaj izbor.</div>
      )}
    </div>
  );
}
