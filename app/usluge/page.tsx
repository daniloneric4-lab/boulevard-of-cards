import Link from 'next/link';
import type { Metadata } from 'next';
import { getSessionInfo } from '@/lib/supabase/server';
import PageHero from '@/components/PageHero';
import ActionForm from '@/components/ActionForm';
import { requestService } from '@/app/_act/market';
import { SERVICE_STATUS, date, money } from '@/lib/format';

export const metadata: Metadata = { title: 'Usluge' };
export const dynamic = 'force-dynamic';

// PSA nivoi (okvirne cene, PSA ih menja; tačan iznos javljamo pre slanja paketa)
const TIERS: [string, string, string][] = [
  ['standard', 'Standard', 'oko $60 po kartici · kartica do $1.000 · oko 90–100 radnih dana kod PSA'],
  ['priority', 'Priority', 'oko $80 po kartici · kartica do $1.500 · oko 70–80 radnih dana'],
  ['express', 'Express', 'oko $199 po kartici · kartica do $2.500 · oko 20–30 radnih dana'],
];

const DEFS: Record<string, { label: string; kicker: string; title: string; text: string; f1: string; p1: string; optLabel: string; opts: [string, string][]; cta: string; flow: string[] }> = {
  grading: {
    label: 'PSA gradiranje',
    kicker: 'PSA gradiranje · zbirni paket',
    title: 'Pošalji karticu na PSA preko nas',
    text: 'Skupljamo kartice od više kolekcionara i šaljemo ih u PSA u jednom paketu. Ti plaćaš samo PSA naknadu za ocenu. Slanje paketa do PSA i nazad plaćamo mi.',
    f1: 'Koje kartice šalješ (svaka u novi red)',
    p1: '2025 Topps Chrome F1 Antonelli Rookie Refractor /99\n2025-26 Topps Chrome UCL Yamal',
    optLabel: 'Kako nam predaješ kartice',
    opts: [
      ['Donosim lično', 'Beograd, uz najavu'],
      ['Šaljem poštom', 'Slanje do nas plaćaš ti, pakuj u toploader'],
      ['Već su kod nas', 'Kartice iz sefa ili porudžbine'],
    ],
    cta: 'Prijavi kartice za gradiranje',
    flow: [
      'Prijaviš kartice ovde i izabereš PSA nivo',
      'Doneseš ili pošalješ kartice nama, mi ih proverimo',
      'Čekamo da se skupi pun paket, napredak vidiš gore',
      'Kad se paket skupi, plaćaš PSA naknadu i šaljemo u PSA (slanje plaćamo mi)',
      'Kartice se vraćaju ocenjene, u slabu. Javljamo ti svaki korak',
    ],
  },
  vault: {
    label: 'Sef',
    kicker: 'Sef · osigurano čuvanje',
    title: 'Kartica ostaje kod nas, a ti je prodaješ jednim dodirom',
    text: 'Kartice u sefu su osigurane i fotografisane. Prodaja i razmena idu bez slanja, a kupac dobija karticu direktno iz sefa.',
    f1: 'Šta ostavljaš u sef',
    p1: 'npr. 2 kartice iz kolekcije',
    optLabel: 'Kako stiže do nas',
    opts: [
      ['Iz porudžbine', 'Kupljeno kod nas ide pravo u sef'],
      ['Donosim lično', 'Beograd, uz najavu'],
      ['Šaljem poštom', 'Etiketa i osiguranje uključeni'],
    ],
    cta: 'Otvori sef',
    flow: ['Izabereš kartice za sef', 'Primamo ih, fotografišemo i osiguravamo', 'Kartice se vide u tvojoj kolekciji sa oznakom SEF', 'Prodaješ ili menjaš bez slanja'],
  },
  consignment: {
    label: 'Konsignacija',
    kicker: 'Konsignacija · prodajemo umesto tebe',
    title: 'Mi prodajemo, ti pratiš status',
    text: 'Kartice nudimo ovde i na većim svetskim tržištima. Ti odobravaš cenu, mi pakujemo i šaljemo, a novac dobijaš posle prodaje.',
    f1: 'Kartice za prodaju',
    p1: 'npr. Jokić Chrome /99 PSA 10',
    optLabel: 'Gde da prodajemo',
    opts: [
      ['Samo Boulevard of Cards', 'Najbrže za kupce iz regiona'],
      ['Boulevard + eBay', 'Šira publika'],
      ['Svuda', 'Sva tržišta koja pokrivamo'],
    ],
    cta: 'Pošalji na prodaju',
    flow: ['Pošalješ spisak kartica', 'Predlažemo cenu na osnovu prodaja', 'Ti odobriš, mi objavljujemo', 'Isplata posle prodaje'],
  },
  buyback: {
    label: 'Otkup',
    kicker: 'Otkup · novac odmah',
    title: 'Dobij fiksnu ponudu za svoju karticu',
    text: 'Opiši karticu. Šaljemo fiksnu ponudu u poruke, a novac stiže čim kartica stigne kod nas.',
    f1: 'Koja kartica',
    p1: 'npr. Merlin insert, ime igrača, stanje',
    optLabel: 'Isplata',
    opts: [
      ['Na račun', 'Isti dan kad kartica stigne'],
      ['Kredit u prodavnici', '+10% vrednosti'],
      ['Lično u Beogradu', 'Uz najavu'],
    ],
    cta: 'Dobij ponudu',
    flow: ['Opišeš karticu', 'Šaljemo fiksnu ponudu', 'Prihvatiš i pošalješ karticu', 'Isplata čim stigne'],
  },
};

export default async function Services({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const key = t && DEFS[t] ? t : 'grading';
  const d = DEFS[key];
  const { supabase, user } = await getSessionInfo();
  const [{ data: items }, { data: prog }, { data: mine }] = await Promise.all([
    user ? supabase.from('collection_items').select('id, title').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
    key === 'grading' ? supabase.rpc('grading_progress') : Promise.resolve({ data: null }),
    user && key === 'grading'
      ? supabase.from('service_requests').select('id, status, card_count, tier, cards, notes, created_at, quoted_cents, grading_batches(code, status)').eq('user_id', user.id).eq('service', 'grading').order('created_at', { ascending: false }).limit(20)
      : Promise.resolve({ data: [] }),
  ]);
  const p = (Array.isArray(prog) ? prog[0] : prog) as { code: string; cards: number; target: number; people: number } | null;
  const pct = p ? Math.min(100, Math.round((p.cards / Math.max(p.target, 1)) * 100)) : 0;

  return (
    <>
      <PageHero kicker="Usluge" title="Kartica ne mora nigde da putuje sama" lead="Sef, prodaja umesto tebe i otkup. Sve prijave pratiš u svojoj kolekciji.">
        <div className="chips" role="tablist" aria-label="Usluge">
          {Object.entries(DEFS).map(([k, v]) => (
            <Link key={k} href={`/usluge?t=${k}`} role="tab" aria-selected={k === key} className="chip" style={k === key ? { background: '#fff', color: 'var(--bc-carbon)' } : { background: 'transparent', color: '#fff', borderColor: 'var(--bc-line-dk)' }}>
              {v.label}
            </Link>
          ))}
        </div>
      </PageHero>
      <div className="page">
        <div className="two">
          <section className="stack" style={{ gap: 18 }}>
            <span className="kicker">{d.kicker}</span>
            <h2 style={{ fontSize: 'clamp(26px,3.4vw,38px)' }}>{d.title}</h2>
            <p className="muted" style={{ fontSize: 16 }}>
              {d.text}
            </p>
            {key === 'grading' ? (
              <div className="card stack" style={{ gap: 10 }}>
                <div className="row between">
                  <b>Sledeći paket za PSA{p ? ` · ${p.code}` : ''}</b>
                  <span className="mono" style={{ fontSize: 13 }}>
                    {p ? `${p.cards} / ${p.target} kartica` : `0 kartica`}
                  </span>
                </div>
                <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Popunjenost paketa">
                  <span style={{ width: `${pct}%` }} />
                </div>
                <span className="muted" style={{ fontSize: 13 }}>
                  {p && p.cards >= p.target
                    ? 'Paket je pun i uskoro ide u PSA. Nove prijave ulaze u sledeći.'
                    : `Šaljemo čim se skupi ${p?.target ?? 20} kartica${p?.people ? `, do sada od ${p.people} ${p.people === 1 ? 'kolekcionara' : 'kolekcionara'}` : ''}. Što pre se prijaviš, pre ide.`}
                </span>
                <ul className="ticks" style={{ fontSize: 14, margin: 0 }}>
                  <li>Ti plaćaš samo PSA naknadu za ocenu, po nivou koji izabereš.</li>
                  <li>Slanje paketa do PSA i nazad plaćamo mi.</li>
                  <li>Naknadu plaćaš tek kad se paket skupi, pre slanja. Tačan iznos javljamo u obaveštenju.</li>
                </ul>
              </div>
            ) : null}
            <h3>Kako teče</h3>
            <div className="steps">
              {d.flow.map((f, i) => (
                <div key={f} className="step">
                  <span className="step-n">{i + 1}</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/pomoc" className="lnk">
              Pravila i cene →
            </Link>
          </section>
          <section className="card stack">
            <h3>{d.cta}</h3>
            {user ? (
              <ActionForm action={requestService} submit={d.cta} btn="btn btn-red">
                <input type="hidden" name="service" value={key} />
                {key === 'grading' ? (
                  <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 8 }}>
                    <legend style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>PSA nivo</legend>
                    {TIERS.map(([k, l, sub], i) => (
                      <label key={k} className="check-card">
                        <span className="row" style={{ gap: 8 }}>
                          <input type="radio" name="tier" value={k} defaultChecked={i === 0} /> <b>{l}</b>
                        </span>
                        <span className="muted" style={{ fontSize: 13 }}>
                          {sub}
                        </span>
                      </label>
                    ))}
                    <span className="muted" style={{ fontSize: 12 }}>Cene su okvirne, PSA ih povremeno menja. Pre slanja dobijaš tačan iznos.</span>
                  </fieldset>
                ) : null}
                {items && items.length ? (
                  <label className="fld">
                    Iz kolekcije (nije obavezno)
                    <select className="inp" name="collection_item_id" defaultValue="">
                      <option value="">— izaberi karticu —</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.title}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="fld">
                  {d.f1}
                  <textarea className="inp" name="notes" placeholder={d.p1} rows={key === 'grading' ? 4 : 3} />
                </label>
                {key === 'grading' ? (
                  <label className="fld">
                    Ukupna vrednost kartica (RSD, okvirno, za osiguranje)
                    <input className="inp" name="declared_value" inputMode="numeric" placeholder="npr. 50000" />
                  </label>
                ) : null}
                <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0, gap: 8 }}>
                  <legend style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{d.optLabel}</legend>
                  {d.opts.map(([l, sub], i) => (
                    <label key={l} className="check-card">
                      <span className="row" style={{ gap: 8 }}>
                        <input type="radio" name="opt" value={l} defaultChecked={i === 0} /> <b>{l}</b>
                      </span>
                      <span className="muted" style={{ fontSize: 13 }}>
                        {sub}
                      </span>
                    </label>
                  ))}
                </fieldset>
              </ActionForm>
            ) : (
              <div className="stack">
                <p className="muted">Prijavi se da pošalješ prijavu. Status pratiš u kolekciji.</p>
                <Link href={`/prijava?next=/usluge?t=${key}`} className="btn btn-red" style={{ alignSelf: 'flex-start' }}>
                  Log in
                </Link>
              </div>
            )}
          </section>
        </div>
        {key === 'grading' && mine && mine.length ? (
          <section className="stack">
            <h2>Moje prijave za gradiranje</h2>
            <div className="list">
              {(mine as unknown as { id: string; status: string; card_count: number; tier: string | null; cards: string | null; notes: string | null; created_at: string; quoted_cents: number | null; grading_batches: { code: string; status: string } | { code: string; status: string }[] | null }[]).map((r) => {
                const b = Array.isArray(r.grading_batches) ? r.grading_batches[0] : r.grading_batches;
                return (
                  <div key={r.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                    <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: 14, whiteSpace: 'pre-line' }}>{r.cards || r.notes}</b>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {r.card_count} {r.card_count === 1 ? 'kartica' : 'kartica'} · {(r.tier ?? 'standard').toUpperCase()} · {date(r.created_at)}
                        {b ? ` · paket ${b.code}` : ''}
                        {r.quoted_cents ? ` · PSA naknada ${money(r.quoted_cents)}` : ''}
                      </span>
                    </div>
                    <span className={'pill' + (r.status === 'returned' ? ' pill-green' : '')}>{SERVICE_STATUS[r.status] ?? r.status}</span>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
