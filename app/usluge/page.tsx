import Link from 'next/link';
import type { Metadata } from 'next';
import { getSessionInfo } from '@/lib/supabase/server';
import PageHero from '@/components/PageHero';
import ActionForm from '@/components/ActionForm';
import { requestService } from '@/app/_act/market';

export const metadata: Metadata = { title: 'Usluge' };
export const dynamic = 'force-dynamic';

const DEFS: Record<string, { label: string; kicker: string; title: string; text: string; f1: string; p1: string; optLabel: string; opts: [string, string][]; cta: string; flow: string[] }> = {
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
  const key = t && DEFS[t] ? t : 'vault';
  const d = DEFS[key];
  const { supabase, user } = await getSessionInfo();
  const { data: items } = user ? await supabase.from('collection_items').select('id, title').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(100) : { data: [] };

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
                  <textarea className="inp" name="notes" placeholder={d.p1} />
                </label>
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
      </div>
    </>
  );
}
