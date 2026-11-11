import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import PageHero from '@/components/PageHero';
import CardArt from '@/components/CardArt';
import Empty from '@/components/Empty';
import { DRAW_STATUS, date, money, sportLabel } from '@/lib/format';

export const metadata: Metadata = { title: 'Izvlačenja' };
export const dynamic = 'force-dynamic';

const HOW = [
  ['Prijava je besplatna', 'Jedna prijava po nalogu dok su prijave otvorene. Ne plaćaš ništa unapred.'],
  ['Izvlačenje uživo', 'Kupce bira nasumično izvlačenje, uživo na Instagramu. Rezultat stiže u obaveštenja.'],
  ['24 sata za uplatu', 'Izvučeni imaju 24 sata da plate. Posle toga mesto ide sledećem sa rezervne liste.'],
  ['Kutija ili otvaranje', 'Biraš zapečaćenu kutiju uz video pakovanja ili da je otvorimo za tebe.'],
];

export default async function Draws() {
  const supabase = await createClient();
  const { data: draws } = await supabase
    .from('draws')
    .select('id, status, opens_at, closes_at, draw_at, boxes_available, price_cents, currency, releases(name, sport, box_format)')
    .order('closes_at', { ascending: true });
  const list = draws ?? [];
  const active = list.filter((d) => ['scheduled', 'open', 'closed'].includes(d.status));
  const past = list.filter((d) => ['drawn', 'finished'].includes(d.status)).reverse();
  const counts = await Promise.all(active.map((d) => supabase.rpc('draw_entry_count', { p_draw_id: d.id })));

  return (
    <>
      <PageHero
        kicker="Izvlačenja"
        title="Retke kutije, fer za sve"
        lead="Umesto „ko pre klikne“, prijava je besplatna, a kupce bira nasumično izvlačenje uživo. Plaćaš samo ako budeš izvučen."
      />
      <div className="page">
        <section className="stack">
          <h2>Otvorena i sledeća izvlačenja</h2>
          {active.length ? (
            <div className="grid-tiles">
              {active.map((d, i) => {
                const r = Array.isArray(d.releases) ? d.releases[0] : d.releases;
                return (
                  <Link key={d.id} href={`/izvlacenja/${d.id}`} className="tile">
                    <div className="tile-media">
                      <CardArt seed={d.id} grade="SEALED" />
                      <span className="tile-tag">{sportLabel(r?.sport)}</span>
                      <span className="tile-time">{DRAW_STATUS[d.status]}</span>
                    </div>
                    <div className="tile-body">
                      <span className="tile-title">{r?.name ?? 'Izvlačenje'}</span>
                      <span className="muted" style={{ fontSize: 13 }}>
                        {d.boxes_available} kutija · {counts[i]?.data ?? 0} prijavljenih
                      </span>
                      <span className="muted" style={{ fontSize: 13 }}>
                        Prijave do {date(d.closes_at, true)}
                      </span>
                      <div className="tile-foot">
                        <span className="tile-price">{money(d.price_cents, d.currency)}</span>
                        <span className="btn btn-sm btn-red">{d.status === 'open' ? 'Prijavi se' : 'Detalji'}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Empty title="Trenutno nema otvorenih izvlačenja" text="Sledeće izvlačenje najavljujemo na početnoj i u obaveštenjima." href="/prijava?mode=signup" cta="Napravi nalog i budi prvi" />
          )}
        </section>

        <section className="stack">
          <h2>Kako teče izvlačenje</h2>
          <div className="steps">
            {HOW.map(([t, x], i) => (
              <div key={t} className="step">
                <span className="step-n">{i + 1}</span>
                <b>{t}</b>
                <span className="muted" style={{ fontSize: 14 }}>
                  {x}
                </span>
              </div>
            ))}
          </div>
        </section>

        {past.length ? (
          <section className="stack">
            <h2>Prošla izvlačenja</h2>
            <div className="list">
              {past.map((d) => {
                const r = Array.isArray(d.releases) ? d.releases[0] : d.releases;
                return (
                  <Link key={d.id} href={`/izvlacenja/${d.id}`} className="list-row" style={{ textDecoration: 'none' }}>
                    <b style={{ flex: 1 }}>{r?.name}</b>
                    <span className="mono muted">{date(d.draw_at ?? d.closes_at)}</span>
                    <span className="pill">{DRAW_STATUS[d.status]}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
