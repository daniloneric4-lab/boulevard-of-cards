'use client';
import { useActionState } from 'react';
import { saveAccount } from '@/app/_act/account';
import { SPORTS } from '@/lib/format';

type Props = {
  p: { username: string; display_name: string; city: string; country: string; bio: string; collects: string };
  s: { script: string; sports: string[]; notify_email: boolean; notify_push: boolean; prefs: Record<string, boolean> };
};
const NOTIFS: [string, string][] = [
  ['outbid', 'Neko me je nadmašio na aukciji'],
  ['draw', 'Rezultat izvlačenja'],
  ['offers', 'Ponude i razmene u porukama'],
  ['shipping', 'Slanje i isporuka porudžbina'],
  ['wishlist', 'Kartica sa liste želja je na prodaji'],
  ['live', 'Počinje live otvaranje'],
  ['news', 'Novi izlasci i preorder kalendar'],
];

export default function SettingsForm({ p, s }: Props) {
  const [state, run, pending] = useActionState(saveAccount, { ok: false, msg: '' });
  const pref = (k: string) => s.prefs[k] ?? true;
  return (
    <form action={run} className="stack" style={{ gap: 24 }}>
      <section id="profil" className="card stack">
        <h3>Profil</h3>
        <label className="fld">
          Slika profila (do 3 MB)
          <input className="inp" type="file" name="avatar" accept="image/*" />
        </label>
        <div className="row" style={{ gap: 10 }}>
          <label className="fld" style={{ flex: '1 1 200px' }}>
            Korisničko ime
            <input className="inp" name="username" defaultValue={p.username} required pattern="[a-z0-9_]{3,24}" title="3–24 mala slova, brojevi ili _" />
          </label>
          <label className="fld" style={{ flex: '1 1 200px' }}>
            Ime za prikaz
            <input className="inp" name="display_name" defaultValue={p.display_name} maxLength={60} />
          </label>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <label className="fld" style={{ flex: '1 1 200px' }}>
            Grad
            <input className="inp" name="city" defaultValue={p.city} maxLength={60} list="gradovi" />
            <datalist id="gradovi">
              {['Beograd', 'Novi Sad', 'Niš', 'Kragujevac', 'Subotica', 'Sarajevo', 'Banja Luka', 'Podgorica', 'Skoplje', 'Zagreb'].map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </label>
          <label className="fld" style={{ flex: '1 1 160px' }}>
            Država
            <select className="inp" name="country" defaultValue={p.country || 'RS'}>
              <option value="RS">Srbija</option>
              <option value="BA">Bosna i Hercegovina</option>
              <option value="ME">Crna Gora</option>
              <option value="MK">Severna Makedonija</option>
              <option value="HR">Hrvatska</option>
              <option value="SI">Slovenija</option>
            </select>
          </label>
        </div>
        <label className="fld">
          Šta skupljaš (vidi se na profilu)
          <input className="inp" name="collects" defaultValue={p.collects} maxLength={200} placeholder="npr. F1 rookie kartice i Chrome UCL" />
        </label>
        <label className="fld">
          O meni
          <textarea className="inp" name="bio" defaultValue={p.bio} maxLength={500} />
        </label>
      </section>

      <section className="card stack">
        <h3>Sportovi koje pratiš</h3>
        <div className="check-grid">
          {SPORTS.map((x) => (
            <label key={x.key} className="check-card">
              <span className="row" style={{ gap: 8 }}>
                <input type="checkbox" name="sports" value={x.key} defaultChecked={s.sports.includes(x.key)} /> <b>{x.label}</b>
              </span>
            </label>
          ))}
        </div>
        <label className="fld" style={{ maxWidth: 260 }}>
          Pismo
          <select className="inp" name="script" defaultValue={s.script}>
            <option value="latin">Latinica</option>
            <option value="cyrillic">Ćirilica</option>
          </select>
        </label>
      </section>

      <section id="obavestenja" className="card stack">
        <h3>Obaveštenja</h3>
        <div className="row">
          <label className="chk">
            <input type="checkbox" name="notify_email" defaultChecked={s.notify_email} /> E-pošta
          </label>
          <label className="chk">
            <input type="checkbox" name="notify_push" defaultChecked={s.notify_push} /> Telefon
          </label>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          {NOTIFS.map(([k, l]) => (
            <label key={k} className="chk">
              <input type="checkbox" name={'n_' + k} defaultChecked={pref(k)} /> {l}
            </label>
          ))}
        </div>
      </section>

      {state.msg ? (
        <div className={'alert ' + (state.ok ? 'alert-ok' : 'alert-err')} role="status">
          {state.msg}
        </div>
      ) : null}
      <button className="btn btn-red" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Čuvam…' : 'Sačuvaj izmene'}
      </button>
    </form>
  );
}
