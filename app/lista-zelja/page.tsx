import Link from 'next/link';
import type { Metadata } from 'next';
import { getSessionInfo } from '@/lib/supabase/server';
import PageHero from '@/components/PageHero';
import WishForm from '@/components/WishForm';
import SubmitButton from '@/components/SubmitButton';
import { removeWish } from '@/app/_act/market';
import { quickWish } from '@/app/_act/wish';
import { SPORTS, money, sportLabel } from '@/lib/format';
import { cardNorm, correctQuery, wishMatches } from '@/lib/spell';

export const metadata: Metadata = { title: 'Lista želja' };
export const dynamic = 'force-dynamic';

type Cat = { id: string; sport: string; title: string | null; player: string | null; set_name: string | null; year: string | null; parallel: string | null };
const label = (c: Cat) => c.title || [c.year, c.set_name, c.player, c.parallel].filter(Boolean).join(' · ');

export default async function WishList({ searchParams }: { searchParams: Promise<{ q?: string; sport?: string; tacno?: string }> }) {
  const sp = await searchParams;
  const sport = sp.sport && SPORTS.some((s) => s.key === sp.sport) ? sp.sport : undefined;
  const typed = sp.q?.trim() || '';
  const fix = correctQuery(typed);
  const q = sp.tacno ? typed : fix.q;
  const corrected = !!typed && !sp.tacno && fix.changed;
  const { supabase, user } = await getSessionInfo();

  let cq = supabase.from('card_catalog').select('id, sport, title, player, set_name, year, parallel').limit(300);
  if (sport) cq = cq.eq('sport', sport);
  for (const tok of cardNorm(q).split(' ').filter((t) => t.length >= 2).slice(0, 6)) cq = cq.ilike('norm', `%${tok}%`);

  const [{ data: cats }, { data: active }, { data: mine }] = await Promise.all([
    cq,
    supabase.from('listings').select('id, title, catalog_id, price_cents, currency').eq('status', 'active').neq('mode', 'showcase').limit(1000),
    user ? supabase.from('wishlist').select('id, query, catalog_id, max_price_cents, created_at, card_catalog(title, player, set_name, year, parallel, sport)').eq('user_id', user.id).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
  ]);

  const live = active ?? [];
  const onSite = (catId: string) => live.filter((l) => l.catalog_id === catId).length;
  const cards = ((cats ?? []) as Cat[])
    .map((c) => ({ ...c, n: onSite(c.id) }))
    .sort((a, b) => b.n - a.n || label(a).localeCompare(label(b), 'sr'));
  type Wish = { id: string; query: string | null; catalog_id: string | null; max_price_cents: number | null; card_catalog: Cat | Cat[] | null };
  const wishes = ((mine ?? []) as unknown as Wish[]).map((w) => {
    const c = Array.isArray(w.card_catalog) ? w.card_catalog[0] : w.card_catalog;
    const name = c ? label(c) : w.query ?? '';
    const hits = live.filter((l) => (w.catalog_id && l.catalog_id === w.catalog_id) || (w.query && wishMatches(w.query, l.title)));
    const cheap = w.max_price_cents ? hits.filter((h) => h.price_cents != null && h.price_cents <= w.max_price_cents!) : hits;
    return { ...w, name, hits: cheap };
  });
  const wishedCat = new Set(wishes.map((w) => w.catalog_id).filter(Boolean));
  const exact = q && cards.some((c) => cardNorm(label(c)) === cardNorm(q));
  const suggestions = cards.slice(0, 200).map(label);
  const qs = (s?: string) => {
    const u = new URLSearchParams();
    if (q) u.set('q', q);
    if (s) u.set('sport', s);
    const t = u.toString();
    return '/lista-zelja' + (t ? '?' + t : '');
  };

  return (
    <>
      <PageHero
        kicker="Lista želja"
        title="Traži karticu. Javljamo kad stigne."
        lead="Upiši karticu ili kutiju koju tražiš. Čim je neko postavi na sajt, stiže ti obaveštenje. Možeš da postaviš i cenu ispod koje te zanima."
      />
      <div className="page">
        <div className="two" style={{ alignItems: 'start' }}>
          <section className="card stack">
            <h2 style={{ fontSize: 22 }}>Dodaj na listu</h2>
            {user ? (
              <WishForm suggestions={suggestions} />
            ) : (
              <div className="stack">
                <p className="muted">Prijavi se da bi pravio listu želja i dobijao obaveštenja.</p>
                <Link href="/prijava?next=/lista-zelja" className="btn btn-red" style={{ alignSelf: 'flex-start' }}>
                  Log in
                </Link>
              </div>
            )}
            <ol className="ticks muted" style={{ fontSize: 13, margin: 0 }}>
              <li>Ime se samo ispravi: „saphire” postaje „Sapphire”.</li>
              <li>Može i kartica koje još nema na sajtu, npr. „Kimi Antonelli”. Čim je neko postavi, stiže ti obaveštenje.</li>
              <li>Ne mora tačan naziv: dovoljno je ime igrača, a reči kao Chrome ili /99 suze izbor.</li>
              <li>Obaveštenje stiže i kad oglas pojeftini ispod tvoje cene.</li>
            </ol>
          </section>

          <section className="card stack">
            <h2 style={{ fontSize: 22 }}>Moja lista{wishes.length ? ` · ${wishes.length}` : ''}</h2>
            {!user ? (
              <span className="muted">Ovde će stajati kartice koje tražiš.</span>
            ) : wishes.length ? (
              <div className="list">
                {wishes.map((w) => (
                  <div key={w.id} className="list-row" style={{ padding: '10px 0', alignItems: 'center' }}>
                    <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 14 }}>{w.name}</b>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {w.max_price_cents ? `Javi kad je ispod ${money(w.max_price_cents)}` : 'Javi kad se pojavi'}
                      </span>
                    </div>
                    {w.hits.length ? (
                      w.hits.length === 1 ? (
                        <Link href={`/oglas/${w.hits[0].id}`} className="pill pill-green">
                          Na sajtu · {money(w.hits[0].price_cents, w.hits[0].currency)}
                        </Link>
                      ) : (
                        <Link href={`/prodavnica?q=${encodeURIComponent(w.name)}`} className="pill pill-green">
                          {w.hits.length} na sajtu
                        </Link>
                      )
                    ) : (
                      <span className="pill">Čekamo</span>
                    )}
                    <form action={removeWish}>
                      <input type="hidden" name="id" value={w.id} />
                      <SubmitButton className="btn btn-sm btn-ghost" pendingText="…">
                        <span aria-hidden="true">×</span>
                        <span className="sr-only">Ukloni {w.name}</span>
                      </SubmitButton>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <span className="muted" style={{ fontSize: 14 }}>
                Još ništa ne tražiš. Upiši karticu levo ili izaberi iz spiska ispod.
              </span>
            )}
          </section>
        </div>

        <section className="stack">
          <div className="row between">
            <div className="stack" style={{ gap: 4 }}>
              <span className="kicker">Sve kartice i kutije</span>
              <h2>Izaberi iz spiska</h2>
            </div>
            <form action="/lista-zelja" role="search" className="row" style={{ flexWrap: 'nowrap', minWidth: 'min(460px, 100%)' }}>
              {sport ? <input type="hidden" name="sport" value={sport} /> : null}
              <label className="sr-only" htmlFor="wq">
                Pretraga
              </label>
              <input id="wq" className="inp" name="q" defaultValue={q} placeholder="Igrač, set, paralela…" />
              <button className="btn btn-dark">Traži</button>
              {q ? (
                <Link href={sport ? `/lista-zelja?sport=${sport}` : '/lista-zelja'} className="btn btn-ghost" aria-label="Obriši pretragu">
                  ×
                </Link>
              ) : null}
            </form>
          </div>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Spisak se sam puni: svaka kartica koju neko postavi na sajt ili doda u javnu kolekciju, i svako novo izdanje, ulazi ovde.
          </p>
          <div className="chips" aria-label="Sport">
            {SPORTS.map((s) => (
              <Link key={s.key} href={qs(sport === s.key ? undefined : s.key)} className={'chip' + (sport === s.key ? ' on' : '')} aria-pressed={sport === s.key}>
                {s.label}
                {sport === s.key ? ' ×' : ''}
              </Link>
            ))}
            {q || sport ? (
              <Link href="/lista-zelja" className="chip" style={{ borderStyle: 'dashed' }}>
                Poništi pretragu ×
              </Link>
            ) : null}
          </div>
          {corrected ? (
            <p className="muted" style={{ fontSize: 14 }} role="status">
              Prikazujem rezultate za <b style={{ color: 'var(--bc-carbon)' }}>{q}</b>.{' '}
              <Link className="lnk" href={`/lista-zelja?q=${encodeURIComponent(typed)}&tacno=1${sport ? '&sport=' + sport : ''}`}>
                Traži tačno „{typed}”
              </Link>
            </p>
          ) : null}
          {q && !exact ? (
            <form action={quickWish} className="card row between" style={{ alignItems: 'center' }}>
              <input type="hidden" name="query" value={q} />
              <input type="hidden" name="back" value={qs(sport)} />
              <span>
                Nema tačno „<b>{q}</b>” u spisku? Dodaj ga na listu, javljamo kad se pojavi.
              </span>
              <SubmitButton className="btn btn-red btn-sm" pendingText="Dodajem…">
                Dodaj „{q}”
              </SubmitButton>
            </form>
          ) : null}
          {cards.length ? (
            <div className="list">
              {cards.map((c) => (
                <div key={c.id} className="list-row" style={{ alignItems: 'center' }}>
                  <span className="pill" style={{ minWidth: 64, justifyContent: 'center' }}>
                    {sportLabel(c.sport)}
                  </span>
                  <Link href={`/katalog/${c.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', fontWeight: 600 }}>
                    {label(c)}
                  </Link>
                  <span className="mono muted" style={{ fontSize: 12, minWidth: 110, textAlign: 'right' }}>
                    {c.n ? <span style={{ color: 'var(--bc-green)' }}>{c.n} na sajtu</span> : 'nije na sajtu'}
                  </span>
                  {wishedCat.has(c.id) ? (
                    <span className="pill pill-green">✓ Na listi</span>
                  ) : (
                    <form action={quickWish}>
                      <input type="hidden" name="catalog_id" value={c.id} />
                      <input type="hidden" name="back" value={qs(sport)} />
                      <SubmitButton className="btn btn-sm btn-dark" pendingText="…">
                        Želim
                      </SubmitButton>
                    </form>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="alert alert-info">Nema rezultata za ovaj izbor.</div>
          )}
        </section>
      </div>
    </>
  );
}
