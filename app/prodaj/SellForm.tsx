'use client';
import { useActionState, useState } from 'react';
import { createListing } from '@/app/_act/market';
import { SPORTS } from '@/lib/format';
import CardArt from '@/components/CardArt';

const MODES: [string, string, string][] = [
  ['fixed', 'Kupi odmah', 'Fiksna cena, kupac plaća odmah'],
  ['auction', 'Aukcija', 'Početna cena, traje 1–14 dana'],
  ['offers', 'Primam ponude', 'Kupci šalju ponude u poruke'],
  ['trade', 'Za razmenu', 'Traži karticu u zamenu'],
  ['showcase', 'Samo izloži', 'Vitrina, bez prodaje'],
];

export default function SellForm({ initialTitle = '', initialSport = 'football', initialMode = 'fixed' }: { initialTitle?: string; initialSport?: string; initialMode?: string }) {
  const [state, run, pending] = useActionState(createListing, { ok: false, msg: '' });
  const [mode, setMode] = useState(initialMode);
  const [title, setTitle] = useState(initialTitle);
  const [grader, setGrader] = useState('raw');
  const [grade, setGrade] = useState('10');
  const [price, setPrice] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const gl = grader === 'raw' ? 'RAW' : `${grader.toUpperCase()} ${grade}`;

  return (
    <div className="side">
      <form action={run} className="stack" style={{ gap: 22 }}>
        <section className="card stack">
          <h3>1. Slikaj karticu</h3>
          <p className="muted" style={{ fontSize: 14 }}>
            Slikaj prednju stranu ravno, bez odsjaja. Ako je kartica u kućištu, neka se vidi ocena.
          </p>
          <label className="fld">
            Fotografija (do 4 MB)
            <input
              className="inp"
              type="file"
              name="image"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPreview(f ? URL.createObjectURL(f) : null);
              }}
            />
          </label>
        </section>

        <section className="card stack">
          <h3>2. Proveri podatke</h3>
          <label className="fld">
            Kartica (godina, set, igrač, paralela)
            <input className="inp" name="title" required minLength={4} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="2026 Topps Chrome F1 · Rookie Refractor /99" />
          </label>
          <div className="row" style={{ gap: 10 }}>
            <label className="fld" style={{ flex: '1 1 160px' }}>
              Sport
              <select className="inp" name="sport" defaultValue={initialSport}>
                {SPORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="fld" style={{ flex: '1 1 140px' }}>
              Stanje
              <select className="inp" name="grader" value={grader} onChange={(e) => setGrader(e.target.value)}>
                <option value="raw">RAW (bez ocene)</option>
                <option value="psa">PSA</option>
                <option value="bgs">BGS</option>
                <option value="sgc">SGC</option>
                <option value="pca">PCA</option>
              </select>
            </label>
            {grader !== 'raw' ? (
              <>
                <label className="fld" style={{ flex: '0 1 100px' }}>
                  Ocena
                  <input className="inp" name="grade" inputMode="decimal" value={grade} onChange={(e) => setGrade(e.target.value)} />
                </label>
                <label className="fld" style={{ flex: '1 1 160px' }}>
                  Broj sertifikata
                  <input className="inp" name="cert" />
                </label>
              </>
            ) : (
              <label className="fld" style={{ flex: '1 1 200px' }}>
                Opis stanja
                <input className="inp" name="condition" placeholder="npr. odlične ivice, iz paketa u toploader" />
              </label>
            )}
          </div>
          <label className="fld">
            Opis (nije obavezno)
            <textarea className="inp" name="description" maxLength={2000} />
          </label>
        </section>

        <section className="card stack">
          <h3>3. Kako je nudiš</h3>
          <div className="check-grid">
            {MODES.map(([k, l, sub]) => (
              <label key={k} className="check-card">
                <span className="row" style={{ gap: 8 }}>
                  <input type="radio" name="mode" value={k} checked={mode === k} onChange={() => setMode(k)} /> <b>{l}</b>
                </span>
                <span className="muted" style={{ fontSize: 12 }}>
                  {sub}
                </span>
              </label>
            ))}
          </div>
          {mode === 'fixed' || mode === 'auction' || mode === 'offers' ? (
            <div className="row" style={{ gap: 10 }}>
              <label className="fld" style={{ flex: '1 1 200px' }}>
                {mode === 'auction' ? 'Početna cena (RSD)' : mode === 'offers' ? 'Okvirna cena (RSD, nije obavezno)' : 'Cena (RSD)'}
                <input className="inp" name="price" inputMode="decimal" required={mode !== 'offers'} value={price} onChange={(e) => setPrice(e.target.value)} />
              </label>
              {mode === 'auction' ? (
                <label className="fld" style={{ flex: '1 1 140px' }}>
                  Trajanje
                  <select className="inp" name="days" defaultValue="7">
                    {[1, 3, 5, 7, 10, 14].map((d) => (
                      <option key={d} value={d}>
                        {d} {d === 1 ? 'dan' : 'dana'}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}
          {mode === 'fixed' ? (
            <label className="chk">
              <input type="checkbox" name="accepts_offers" /> Primam i ponude
            </label>
          ) : null}
        </section>

        {state.msg ? (
          <div className="alert alert-err" role="status">
            {state.msg}
          </div>
        ) : null}
        <button className="btn btn-red" disabled={pending} style={{ alignSelf: 'flex-start', minHeight: 52, padding: '0 26px' }}>
          {pending ? 'Objavljujem…' : mode === 'showcase' ? 'Izloži u vitrini' : 'Objavi oglas'}
        </button>
      </form>

      <aside className="stack" style={{ position: 'sticky', top: 90 }}>
        <span className="kicker">Pregled oglasa</span>
        <div className="tile">
          <CardArt seed={title || 'novi'} grade={gl} image={preview} />
          <div className="tile-body">
            <span className="tile-title">{title || 'Naziv kartice'}</span>
            <span className="muted" style={{ fontSize: 13 }}>
              {MODES.find((m) => m[0] === mode)?.[1]}
            </span>
            <div className="tile-foot">
              <span className="tile-price">{price ? `${Number(price.replace(',', '.')).toLocaleString('sr-Latn-RS')} RSD` : '—'}</span>
            </div>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>
          Novac od prodaje dobijaš kad kupac potvrdi prijem. Kartica sa QR pasošem se brže prodaje.
        </p>
      </aside>
    </div>
  );
}
