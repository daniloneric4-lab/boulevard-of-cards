'use client';
import { useActionState, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import CardCropper from '@/components/CardCropper';
import { createListing } from '@/app/_act/market';
import { SPORTS } from '@/lib/format';
import CardArt from '@/components/CardArt';
import BoxArt from '@/components/BoxArt';
import { FixNote } from '@/components/AutoFixInput';
import { autocorrect } from '@/lib/spell';

const MODES: [string, string, string][] = [
  ['fixed', 'Kupi odmah', 'Fiksna cena, kupac plaća odmah'],
  ['auction', 'Aukcija', 'Početna cena, traje 1–14 dana'],
  ['offers', 'Primam ponude', 'Kupci šalju ponude u poruke'],
  ['trade', 'Za razmenu', 'Traži karticu u zamenu'],
  ['showcase', 'Samo izloži', 'Vitrina, bez prodaje'],
];

const MAX_RSD = 20_000_000;

// ponuđena stanja (biraju se iz padajuće liste)
const CARD_STATES = [
  'Iz paketa pravo u zaštitu (Pack fresh)',
  'Kao nova (Mint), bez vidljivih tragova',
  'Odlična (Near Mint), sitni tragovi tek izbliza',
  'Vrlo dobra (Excellent), blago izlizani ćoškovi ili ivice',
  'Dobra (Very Good), vidljivi tragovi korišćenja',
  'Oštećena (pregib, ogrebotina ili mrlja)',
];
const BOX_STATES = [
  'Fabrički zatvorena, u originalnoj foliji',
  'Zatvorena, bez folije',
  'Zatvorena, oštećena folija ili ambalaža',
  'Otvorena, svi paketi zatvoreni (kompletna)',
  'Otvorena, nekompletna',
];

// smanji sliku pre slanja (najviše 1600 px, JPEG), da otpremanje bude brzo i pouzdano
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    const out = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.86));
    return out ?? file;
  } catch {
    return file;
  }
}

export default function SellForm({ initialTitle = '', initialSport = 'football', initialMode = 'fixed', userId }: { initialTitle?: string; initialSport?: string; initialMode?: string; userId: string }) {
  const [state, run, pending] = useActionState(createListing, { ok: false, msg: '' });
  const [, start] = useTransition();
  const [imgPath, setImgPath] = useState('');
  const [upState, setUpState] = useState<'' | 'busy' | 'ok' | 'err'>('');
  const [localErr, setLocalErr] = useState('');
  const [mode, setMode] = useState(initialMode);
  const [title, setTitle] = useState(initialTitle);
  const [prevTitle, setPrevTitle] = useState<string | null>(null);
  const [kind, setKind] = useState('card');
  const [grader, setGrader] = useState('raw');
  const [grade, setGrade] = useState('10');
  const [price, setPrice] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const upload = async (blob: Blob) => {
    setUpState('busy');
    setImgPath('');
    const path = `${userId}/${crypto.randomUUID()}.jpg`;
    const { error } = await createClient().storage.from('listing-images').upload(path, blob, { contentType: 'image/jpeg' });
    if (error) setUpState('err');
    else {
      setImgPath(path);
      setUpState('ok');
    }
  };
  const gl = kind === 'supply' ? 'OPREMA' : kind === 'sealed_box' ? 'BOX' : grader === 'raw' ? 'RAW' : `${grader.toUpperCase()} ${grade}`;

  return (
    <div className="side">
      <form
        className="stack"
        style={{ gap: 22 }}
        onSubmit={(e) => {
          // ne koristimo action={run} da se forma ne bi obrisala ako nešto ne prođe
          e.preventDefault();
          setLocalErr('');
          if (cropFile) return setLocalErr('Prvo iseci karticu ili izaberi „Koristi celu sliku”.');
          if (upState === 'busy') return setLocalErr('Slika se još šalje, sačekaj sekund.');
          if (!imgPath) return setLocalErr('Dodaj sliku kartice. Oglas bez slike ne može da se objavi.');
          const n = Number(price.replace(/\s/g, '').replace(',', '.'));
          if (price && (!Number.isFinite(n) || n <= 0)) return setLocalErr('Cena nije ispravna.');
          if (n > MAX_RSD) return setLocalErr(`Najveća cena je ${MAX_RSD.toLocaleString('sr-Latn-RS')} RSD.`);
          const fd = new FormData(e.currentTarget);
          start(() => run(fd));
        }}
      >
        <input type="hidden" name="image_path" value={imgPath} />
        <section className="card stack">
          <h3>1. Slikaj karticu</h3>
          <p className="muted" style={{ fontSize: 14 }}>
            Slikaj prednju stranu ravno, bez odsjaja. Ako je kartica u kućištu, neka se vidi ocena.
          </p>
          <label className="fld">
            Fotografija (obavezno)
            <input
              className="inp"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                // prvo isecanje kartice sa slike, pa tek onda slanje
                setPreview(URL.createObjectURL(f));
                setImgPath('');
                setUpState('');
                setCropFile(f);
                e.target.value = '';
              }}
            />
          </label>
          {cropFile ? (
            <CardCropper
              key={cropFile.name + cropFile.size + cropFile.lastModified}
              file={cropFile}
              defaultRatio={kind === 'card' ? (grader === 'raw' ? 'card' : 'slab') : 'free'}
              onDone={(blob, url) => {
                setPreview(url);
                setCropFile(null);
                upload(blob);
              }}
              onSkip={async () => {
                const f = cropFile;
                setCropFile(null);
                upload(await shrink(f));
              }}
            />
          ) : null}
          {upState === 'busy' ? <span className="muted" style={{ fontSize: 13 }}>Šaljem sliku…</span> : null}
          {upState === 'ok' ? <span style={{ fontSize: 13, color: 'var(--bc-green)' }}>✓ Slika je spremna</span> : null}
          {upState === 'err' ? (
            <span style={{ fontSize: 13, color: '#8a1c13' }}>Slika nije poslata. Pokušaj ponovo ili izaberi drugu (JPG, PNG ili WEBP).</span>
          ) : null}
        </section>

        <section className="card stack">
          <h3>2. Proveri podatke</h3>
          <label className="fld">
            {kind === 'supply' ? 'Šta prodaješ (npr. 100 top loadera 35pt)' : kind === 'sealed_box' ? 'Kutija (godina, set, vrsta: Hobby, Jumbo…)' : 'Kartica (godina, set, igrač, paralela)'}
            <input className="inp" name="title" required minLength={4} value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setPrevTitle(null);
              }}
              onBlur={() => {
                const f = autocorrect(title);
                if (f !== title) {
                  setPrevTitle(title);
                  setTitle(f);
                }
              }}
              placeholder="2026 Topps Chrome F1 · Rookie Refractor /99"
            />
            {prevTitle !== null ? <FixNote onUndo={() => (setTitle(prevTitle), setPrevTitle(null))} /> : null}
          </label>
          <div className="row" style={{ gap: 10 }}>
            <label className="fld" style={{ flex: '1 1 160px' }}>
              Šta prodaješ
              <select className="inp" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="card">Kartica</option>
                <option value="sealed_box">Zatvorena kutija</option>
              </select>
            </label>
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
            {kind === 'card' ? (
            <label className="fld" style={{ flex: '1 1 140px' }}>
              Gradiranje
              <select className="inp" name="grader" value={grader} onChange={(e) => setGrader(e.target.value)}>
                <option value="raw">RAW (bez ocene)</option>
                <option value="psa">PSA</option>
                <option value="bgs">BGS</option>
                <option value="sgc">SGC</option>
                <option value="pca">PCA</option>
              </select>
            </label>
            ) : null}
            {kind !== 'card' ? (
              <label className="fld" style={{ flex: '1 1 200px' }}>
                Stanje kutije
                <select className="inp" name="condition" defaultValue="Fabrički zatvorena, u originalnoj foliji">
                  {BOX_STATES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            ) : grader !== 'raw' ? (
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
                Stanje kartice
                <select className="inp" name="condition" defaultValue="Iz paketa pravo u zaštitu (Pack fresh)">
                  {CARD_STATES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
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

        {localErr || state.msg ? (
          <div className="alert alert-err" role="status">
            {localErr || state.msg}
          </div>
        ) : null}
        <button className="btn btn-red" disabled={pending || upState === 'busy'} style={{ alignSelf: 'flex-start', minHeight: 52, padding: '0 26px' }}>
          {pending ? 'Objavljujem…' : mode === 'showcase' ? 'Izloži u vitrini' : 'Objavi oglas'}
        </button>
      </form>

      <aside className="stack" style={{ position: 'sticky', top: 90 }}>
        <span className="kicker">Pregled oglasa</span>
        <div className="tile">
          {kind === 'sealed_box' ? <BoxArt seed={title || 'novi'} image={preview} /> : <CardArt seed={title || 'novi'} grade={gl} image={preview} />}
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
