import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import PageHero from '@/components/PageHero';
import CardArt from '@/components/CardArt';
import Empty from '@/components/Empty';
import WishForm from '@/components/WishForm';
import { SPORTS, sportLabel } from '@/lib/format';
import { correctQuery } from '@/lib/spell';

export const metadata: Metadata = { title: 'Katalog i vrednost kartica' };
export const dynamic = 'force-dynamic';

export default async function Catalog({ searchParams }: { searchParams: Promise<{ q?: string; sport?: string; tacno?: string }> }) {
  const sp = await searchParams;
  const { sport } = sp;
  const typed = sp.q?.trim() || '';
  const fix = correctQuery(typed);
  const q = sp.tacno ? typed : fix.q;
  const corrected = !sp.tacno && fix.changed;
  const supabase = await createClient();
  let query = supabase.from('card_catalog').select('id, sport, year, set_name, card_number, player, team, parallel, print_run, is_rookie, is_autograph').order('created_at', { ascending: false }).limit(120);
  if (sport && SPORTS.some((s) => s.key === sport)) query = query.eq('sport', sport);
  if (q) {
    const t = q.replace(/[%_,()]/g, ' ').trim();
    query = query.or(`player.ilike.%${t}%,set_name.ilike.%${t}%,team.ilike.%${t}%,parallel.ilike.%${t}%`);
  }
  const { data: cards } = await query;
  const ids = (cards ?? []).map((c) => c.id);
  const { data: offers } = ids.length ? await supabase.from('listings').select('catalog_id').in('catalog_id', ids).eq('status', 'active') : { data: [] };
  const offerCount = (id: string) => (offers ?? []).filter((o) => o.catalog_id === id).length;

  return (
    <>
      <PageHero kicker="Katalog Topps kartica" title="Koliko vredi tvoja kartica?" lead="Pretraži po igraču, setu ili paraleli. Uz svaku karticu vidiš ponude na bulevaru i možeš da je dodaš u kolekciju ili na listu želja.">
        <form action="/katalog" role="search" className="row" style={{ flexWrap: 'nowrap', minWidth: 'min(520px, 100%)' }}>
          {sport ? <input type="hidden" name="sport" value={sport} /> : null}
          <label className="sr-only" htmlFor="kq">
            Pretraga kataloga
          </label>
          <input id="kq" className="inp" name="q" defaultValue={q} placeholder="Igrač, set, paralela…" />
          <button className="btn btn-red">Traži</button>
        </form>
      </PageHero>
      <div className="page">
        <div className="chips">
          <Link href={q ? `/katalog?q=${encodeURIComponent(q)}` : '/katalog'} className={'chip' + (!sport ? ' on' : '')}>
            Sve
          </Link>
          {SPORTS.filter((s) => s.key !== 'other').map((s) => (
            <Link key={s.key} href={`/katalog?sport=${s.key}${q ? '&q=' + encodeURIComponent(q) : ''}`} className={'chip' + (sport === s.key ? ' on' : '')}>
              {s.label}
            </Link>
          ))}
        </div>
        <span className="mono muted" style={{ fontSize: 13 }}>
          {(cards ?? []).length} kartica
        </span>
        {corrected ? (
          <p className="muted" style={{ fontSize: 14 }} role="status">
            Prikazujem rezultate za <b style={{ color: 'var(--bc-carbon)' }}>{q}</b>.{' '}
            <Link className="lnk" href={`/katalog?q=${encodeURIComponent(typed)}&tacno=1${sport ? '&sport=' + sport : ''}`}>
              Traži tačno „{typed}”
            </Link>
          </p>
        ) : null}
        {cards && cards.length ? (
          <div className="grid-tiles">
            {cards.map((c) => (
              <Link key={c.id} href={`/katalog/${c.id}`} className="tile">
                <div className="tile-media">
                  <CardArt seed={c.id} grade={c.is_autograph ? 'AUTO' : c.is_rookie ? 'RC' : 'BASE'} />
                  <span className="tile-tag">{sportLabel(c.sport)}</span>
                </div>
                <div className="tile-body">
                  <span className="tile-title">
                    {c.player}
                    {c.parallel ? ` · ${c.parallel}` : ''}
                    {c.print_run ? ` /${c.print_run}` : ''}
                  </span>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {[c.year, c.set_name, c.card_number ? '#' + c.card_number : null].filter(Boolean).join(' · ')}
                  </span>
                  <div className="tile-foot">
                    <span className="muted" style={{ fontSize: 13 }}>
                      {offerCount(c.id) ? `${offerCount(c.id)} na prodaji` : 'Nema ponuda'}
                    </span>
                    <span className="btn btn-sm btn-ghost">Detalji</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="two">
            <Empty title={q ? 'Nismo našli tu karticu' : 'Katalog se puni'} text={q ? 'Probaj kraće: samo prezime igrača ili ime seta.' : 'Kartice dodaje tim Boulevard of Cards. Do tada, dodaj šta tražiš na listu želja.'} href={q ? '/katalog' : undefined} cta={q ? 'Prikaži sve' : undefined} />
            <div className="card stack">
              <h3>Imaš je ili je tražiš?</h3>
              <WishForm query={q} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
