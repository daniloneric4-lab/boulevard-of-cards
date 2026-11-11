import type { Metadata } from 'next';
import { getSessionInfo } from '@/lib/supabase/server';
import PageHero from '@/components/PageHero';
import ActionForm from '@/components/ActionForm';
import { sendSupport } from '@/app/_act/market';

export const metadata: Metadata = { title: 'Pomoć i pravila' };

const SECS = [
  { id: 'kupovina', label: 'Kupovina', title: 'Kako teče kupovina', lines: ['Izabereš karticu ili kutiju i platiš preko platforme: IPS QR, kartica, uplatnica ili pouzeće.', 'Novac čeka kod platnog procesora, prodavac šalje u roku navedenom u oglasu.', 'Kad potvrdiš prijem, tek tada prodavac dobija novac.'] },
  { id: 'zastita', label: 'Zaštita kupca', title: 'Novac je zaštićen', lines: ['Ako stigne nešto drugo ili oštećeno, otvaraš spor u roku od 3 dana od prijema.', 'Tim odlučuje na osnovu poruka, fotografija i videa pakovanja.', 'Dogovor i plaćanje van platforme gube ovu zaštitu.'] },
  { id: 'izvlacenja', label: 'Izvlačenja', title: 'Fer izvlačenje za retke kutije', lines: ['Prijava je besplatna i jedna po nalogu. Plaćaš samo ako budeš izvučen.', 'Izvlačenje je nasumično i uživo, a rezultat se odmah upisuje na sajt.', 'Izvučeni imaju 24 sata za uplatu, posle toga mesto ide sledećem sa rezervne liste.'] },
  { id: 'aukcije', label: 'Aukcije', title: 'Pravila aukcija', lines: ['Ponuda je obavezujuća. Pobednik dobija porudžbinu i ima 24 sata da plati.', 'Ponuda u poslednja 2 minuta produžava aukciju za 2 minuta.', 'Prodavac ne sme da licitira na svom oglasu.'] },
  { id: 'dostava', label: 'Dostava i carina', title: 'Do vrata u regionu', lines: ['Srbija: kurirska služba za 1–2 radna dana ili preuzimanje u Beogradu.', 'BiH, Crna Gora i Severna Makedonija: carina i PDV su uračunati u cenu do vrata.', 'Svaka pošiljka ima broj za praćenje i video pakovanja.'] },
  { id: 'placanje', label: 'Plaćanje', title: 'Načini plaćanja', lines: ['IPS QR: skeniraš u aplikaciji banke, uplata se potvrđuje za nekoliko sekundi.', 'Platna kartica: Visa, Mastercard i Dina preko sigurne stranice banke.', 'Uplatnica uz rezervaciju 48 sati, pouzeće samo za opremu i kutije.'] },
  { id: 'recnik', label: 'Rečnik', title: 'Reči koje ćeš sresti', lines: ['Hobby: kutija za kolekcionare, sa garantovanim autogramom ili relikvijom.', 'Refraktor: sjajna Chrome verzija kartice. Numerisana paralela (/99, /25) postoji u tačno toliko primeraka.', 'Slab: kartica u plastičnom kućištu sa ocenom (PSA, BGS, SGC, PCA).', 'Superfractor: jedini primerak paralele, 1/1.'] },
];
const FAQ = [
  ['Da li prodajete samo Topps?', 'Da. Boulevard of Cards je samo za Topps: zvanične kutije u prodavnici i Topps kartice kod kolekcionara.'],
  ['Kako znam da kutija nije otvarana?', 'Kutije iz naše prodavnice stižu u originalnom celofanu i pakujemo ih na videu. Kutije od prodavaca sa oznakom „Proverena kutija“ pregledamo pre slanja.'],
  ['Šta je avans kod preordera?', 'Rezervišeš kutiju pre izlaska uz deo cene. Ostatak plaćaš kad kutija stigne kod nas, a ako izlazak kasni, avans možeš da vratiš.'],
  ['Kako radi otvaranje po timovima?', 'Kupiš mesto za tim, mi otvaramo kutije uživo i sve kartice tog tima idu tebi: poštom ili u tvoj sef.'],
  ['Kada prodavac dobija novac?', 'Kad kupac potvrdi prijem. Isplata stiže sledećeg radnog dana na račun koji je prodavac upisao u podešavanjima.'],
  ['Mogu li da platim u evrima?', 'Cene se prikazuju u dinarima, a IPS i uplatnica idu u dinarima. Kartice iz inostranstva naplaćuju se po kursu banke.'],
];

export default async function Help() {
  const { user } = await getSessionInfo();
  return (
    <>
      <PageHero kicker="Pomoć i pravila" title="Kako radi bulevar" lead="Sve o kupovini, zaštiti novca, izvlačenjima, aukcijama i dostavi na jednom mestu.">
        <nav className="chips" aria-label="Teme">
          {[...SECS.map((s) => [s.id, s.label]), ['pitanja', 'Pitanja'], ['kontakt', 'Kontakt']].map(([id, l]) => (
            <a key={id} href={`#${id}`} className="chip" style={{ background: 'transparent', color: '#fff', borderColor: 'var(--bc-line-dk)' }}>
              {l}
            </a>
          ))}
        </nav>
      </PageHero>
      <div className="page">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {SECS.map((s) => (
            <section key={s.id} id={s.id} className="card stack" style={{ scrollMarginTop: 90 }}>
              <span className="kicker">{s.label}</span>
              <h3>{s.title}</h3>
              <ol className="stack" style={{ margin: 0, paddingLeft: 20, gap: 8, fontSize: 14 }}>
                {s.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ol>
            </section>
          ))}
        </div>
        <section id="pitanja" className="stack" style={{ scrollMarginTop: 90 }}>
          <h2>Česta pitanja</h2>
          {FAQ.map(([q, a], i) => (
            <details key={q} className="box" open={i === 0}>
              <summary>{q}</summary>
              <p className="muted" style={{ marginTop: 8 }}>
                {a}
              </p>
            </details>
          ))}
        </section>
        <section id="kontakt" className="two" style={{ scrollMarginTop: 90 }}>
          <div className="stack">
            <h2>Piši nam</h2>
            <p className="muted">Odgovaramo u roku od 24 sata, radnim danima brže. Za hitne stvari oko izvlačenja piši u poruke profila Boulevard of Cards.</p>
          </div>
          <div className="card">
            <ActionForm action={sendSupport} submit="Pošalji" btn="btn btn-red">
              <label className="fld">
                E-pošta
                <input className="inp" type="email" name="email" required defaultValue={user?.email ?? ''} autoComplete="email" />
              </label>
              <label className="fld">
                Tema
                <select className="inp" name="topic" defaultValue="order">
                  <option value="order">Porudžbina</option>
                  <option value="draw">Izvlačenje</option>
                  <option value="auction">Aukcija</option>
                  <option value="service">Usluge (sef, prodaja, otkup)</option>
                  <option value="dispute">Spor sa prodavcem</option>
                  <option value="other">Nešto drugo</option>
                </select>
              </label>
              <label className="fld">
                Poruka
                <textarea className="inp" name="message" required minLength={10} />
              </label>
            </ActionForm>
          </div>
        </section>
      </div>
    </>
  );
}
