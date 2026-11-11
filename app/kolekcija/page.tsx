import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import Avatar from '@/components/Avatar';
import CardArt from '@/components/CardArt';
import ActionForm from '@/components/ActionForm';
import AutoFixInput from '@/components/AutoFixInput';
import SubmitButton from '@/components/SubmitButton';
import WishForm from '@/components/WishForm';
import { addCollectionItem, deleteCollectionItem, removeWish, updateCollectionItem } from '@/app/_act/market';
import { SERVICE, SERVICE_STATUS, date, gradeLabel, money } from '@/lib/format';

export const metadata: Metadata = { title: 'Moja kolekcija' };
export const dynamic = 'force-dynamic';

const LOC: Record<string, string> = { owner: 'Kod mene', vault: 'U sefu', consignment: 'Na prodaji preko nas', grading: 'Na gradiranju' };

export default async function Collection({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = 'sve' } = await searchParams;
  const { supabase, user, profile } = await requireUser('/kolekcija');
  const [{ data: items }, { data: wish }, { data: svc }, { data: listings }] = await Promise.all([
    supabase.from('collection_items').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
    supabase.from('wishlist').select('id, query, max_price_cents, card_catalog(player, set_name, year, parallel)').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('service_requests').select('id, service, status, notes, grading_company, created_at, quoted_cents, currency').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('listings').select('collection_item_id, status, id').eq('seller_id', user.id).in('status', ['active', 'reserved']),
  ]);
  const all = items ?? [];
  const value = all.reduce((s, i) => s + (i.estimated_value_cents ?? 0), 0);
  const listed = new Map((listings ?? []).map((l) => [l.collection_item_id, l.id]));
  const shown = all.filter((i) => (t === 'sef' ? i.location === 'vault' : t === 'prodaja' ? listed.has(i.id) : t === 'razmena' ? i.open_to_trade : t === 'gradirane' ? i.grader && i.grader !== 'raw' : true));
  const TABS: [string, string, number][] = [
    ['sve', 'Sve', all.length],
    ['gradirane', 'Gradirane', all.filter((i) => i.grader && i.grader !== 'raw').length],
    ['prodaja', 'Na prodaji', all.filter((i) => listed.has(i.id)).length],
    ['razmena', 'Za razmenu', all.filter((i) => i.open_to_trade).length],
    ['sef', 'U sefu', all.filter((i) => i.location === 'vault').length],
  ];

  return (
    <div className="page">
      <section className="card-dark row" style={{ gap: 20 }}>
        <Avatar name={profile?.username} url={profile?.avatar_url} size={72} />
        <div className="stack" style={{ gap: 4, flex: '1 1 260px' }}>
          <h1 style={{ fontSize: 'clamp(26px,3.4vw,40px)' }}>@{profile?.username}</h1>
          <span style={{ color: 'var(--bc-gray-dk)', fontSize: 14 }}>
            {[profile?.city, profile?.collects ? 'skuplja ' + profile.collects : null].filter(Boolean).join(' · ') || 'Dodaj grad i šta skupljaš u podešavanjima'}
          </span>
        </div>
        <div className="kv" style={{ flex: '1 1 360px' }}>
          <div>
            <span>Procena</span>
            <b>{money(value)}</b>
          </div>
          <div>
            <span>Kartica</span>
            <b>{all.length}</b>
          </div>
          <div>
            <span>U sefu</span>
            <b>{all.filter((i) => i.location === 'vault').length}</b>
          </div>
        </div>
        <div className="row">
          <Link href="/prodaj" className="btn btn-red">
            Nova objava
          </Link>
          <Link href={`/u/${profile?.username}`} className="btn btn-ghost" style={{ color: '#fff', borderColor: 'var(--bc-line-dk)' }}>
            Javna vitrina
          </Link>
        </div>
      </section>

      <nav className="tabs" aria-label="Filter kolekcije">
        {TABS.map(([k, l, n]) => (
          <Link key={k} href={`/kolekcija?t=${k}`} className={t === k ? 'on' : undefined} aria-current={t === k ? 'page' : undefined}>
            {l} <span className="mono muted" style={{ marginLeft: 6, fontSize: 12 }}>{n}</span>
          </Link>
        ))}
      </nav>

      <div className="side">
        <section className="stack">
          {shown.length ? (
            <div className="grid-tiles">
              {shown.map((i) => (
                <article key={i.id} className="tile">
                  <div className="tile-media">
                    <CardArt seed={i.id} grade={gradeLabel(i.grader, i.grade)} />
                    <span className="tile-tag">{LOC[i.location] ?? i.location}</span>
                  </div>
                  <div className="tile-body">
                    <span className="tile-title">{i.title}</span>
                    <span className="mono muted" style={{ fontSize: 12 }}>
                      {i.passport_code ? `#${i.passport_code}` : ''} {i.is_public ? '· javno' : '· privatno'}
                    </span>
                    <span className="mono" style={{ fontSize: 14 }}>
                      {i.estimated_value_cents ? money(i.estimated_value_cents, i.currency) : 'Bez procene'}
                    </span>
                    <div className="row" style={{ gap: 6, marginTop: 'auto' }}>
                      {listed.has(i.id) ? (
                        <Link href={`/oglas/${listed.get(i.id)}`} className="btn btn-sm btn-dark">
                          Oglas
                        </Link>
                      ) : (
                        <Link href={`/prodaj?title=${encodeURIComponent(i.title)}`} className="btn btn-sm btn-dark">
                          Prodaj
                        </Link>
                      )}
                      <Link href={`/usluge?t=grading`} className="btn btn-sm btn-ghost">
                        Gradiraj
                      </Link>
                      <form action={updateCollectionItem}>
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="open_to_trade" value={i.open_to_trade ? '0' : '1'} />
                        <SubmitButton className="btn btn-sm btn-ghost">{i.open_to_trade ? '✓ Razmena' : 'Za razmenu'}</SubmitButton>
                      </form>
                      <form action={updateCollectionItem}>
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="is_public" value={i.is_public ? '0' : '1'} />
                        <SubmitButton className="btn btn-sm btn-ghost">{i.is_public ? 'Sakrij' : 'Prikaži'}</SubmitButton>
                      </form>
                      {!listed.has(i.id) ? (
                        <form action={deleteCollectionItem}>
                          <input type="hidden" name="id" value={i.id} />
                          <SubmitButton className="btn btn-sm btn-ghost">Ukloni</SubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty">
              <span className="empty-t">{all.length ? 'Nema kartica u ovom filteru' : 'Kolekcija je prazna'}</span>
              <span className="muted">Dodaj prvu karticu desno ili objavi oglas. Kupljene kartice se ovde pojavljuju same.</span>
            </div>
          )}

          <section className="stack" style={{ marginTop: 16 }}>
            <h2>Usluge u toku</h2>
            {svc && svc.length ? (
              <div className="list">
                {svc.map((r) => (
                  <div key={r.id} className="list-row">
                    <span className="pill pill-dark">{SERVICE[r.service]}</span>
                    <span style={{ flex: 1, fontSize: 14 }}>{r.notes || '—'}</span>
                    {r.quoted_cents ? <span className="mono">{money(r.quoted_cents, r.currency)}</span> : null}
                    <span className={'pill ' + (r.status === 'returned' || r.status === 'graded' ? 'pill-green' : '')}>{SERVICE_STATUS[r.status]}</span>
                    <span className="mono muted" style={{ fontSize: 12 }}>
                      {date(r.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="alert alert-info">
                Nemaš prijavljenih usluga. <Link href="/usluge" className="lnk">Gradiranje, sef, konsignacija i otkup →</Link>
              </div>
            )}
          </section>
        </section>

        <aside className="stack">
          <section className="card stack">
            <h3>Dodaj karticu u kolekciju</h3>
            <ActionForm action={addCollectionItem} submit="Dodaj">
              <label className="fld">
                Kartica
                <AutoFixInput className="inp" name="title" required placeholder="2026 Topps Chrome F1 · Refractor" />
              </label>
              <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
                <label className="fld" style={{ flex: 1 }}>
                  Stanje
                  <select className="inp" name="grader" defaultValue="raw">
                    <option value="raw">RAW</option>
                    <option value="psa">PSA</option>
                    <option value="bgs">BGS</option>
                    <option value="sgc">SGC</option>
                    <option value="pca">PCA</option>
                  </select>
                </label>
                <label className="fld" style={{ width: 90 }}>
                  Ocena
                  <input className="inp" name="grade" inputMode="decimal" />
                </label>
              </div>
              <label className="fld">
                Procena vrednosti (RSD)
                <input className="inp" name="value" inputMode="decimal" />
              </label>
              <label className="chk">
                <input type="checkbox" name="is_public" defaultChecked /> Prikaži u javnoj vitrini
              </label>
              <label className="chk">
                <input type="checkbox" name="open_to_trade" /> Otvoren za razmenu
              </label>
            </ActionForm>
          </section>
          <section className="card stack">
            <span className="kicker">Lista želja · alarm</span>
            {wish && wish.length ? (
              <div className="list">
                {wish.map((w) => {
                  const c = Array.isArray(w.card_catalog) ? w.card_catalog[0] : w.card_catalog;
                  return (
                    <div key={w.id} className="list-row" style={{ padding: '10px 0' }}>
                      <div className="stack" style={{ gap: 0, flex: 1 }}>
                        <b style={{ fontSize: 14 }}>{c ? `${c.player}${c.parallel ? ' · ' + c.parallel : ''}` : w.query}</b>
                        <span className="muted" style={{ fontSize: 12 }}>
                          {w.max_price_cents ? `Javi kad je ispod ${money(w.max_price_cents)}` : 'Javi kad se pojavi'}
                        </span>
                      </div>
                      <form action={removeWish}>
                        <input type="hidden" name="id" value={w.id} />
                        <button className="btn btn-sm btn-ghost" aria-label="Ukloni sa liste želja">
                          ×
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="muted" style={{ fontSize: 14 }}>
                Dodaj karticu koju tražiš i javićemo ti kad se pojavi.
              </span>
            )}
            <WishForm compact />
          </section>
        </aside>
      </div>
    </div>
  );
}
