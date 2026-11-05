'use client';
import { useActionState } from 'react';
import { updateProfile } from '@/app/actions';
import { SPORTS } from '@/lib/format';

type P = { display_name: string; city: string; bio: string };
type S = { script: string; sports: string[]; notify_email: boolean; notify_push: boolean };

export default function ProfileForm({ profile, settings }: { profile: P; settings: S }) {
  const [state, action, pending] = useActionState(updateProfile, { ok: false, msg: '' });
  return (
    <form action={action} className="card stack">
      <label className="fld">
        Ime za prikaz
        <input className="inp" name="display_name" defaultValue={profile.display_name} maxLength={60} />
      </label>
      <label className="fld">
        Grad
        <input className="inp" name="city" defaultValue={profile.city} maxLength={60} />
      </label>
      <label className="fld">
        O meni
        <textarea className="inp" name="bio" defaultValue={profile.bio} maxLength={500} />
      </label>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack">
        <legend style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Šta skupljaš?</legend>
        <div className="row">
          {SPORTS.map((s) => (
            <label key={s.key} className="chk">
              <input type="checkbox" name="sports" value={s.key} defaultChecked={settings.sports.includes(s.key)} />
              {s.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="fld">
        Pismo
        <select className="inp" name="script" defaultValue={settings.script}>
          <option value="latin">Latinica</option>
          <option value="cyrillic">Ćirilica</option>
        </select>
      </label>
      <div className="row">
        <label className="chk">
          <input type="checkbox" name="notify_email" defaultChecked={settings.notify_email} /> Obaveštenja na e-poštu
        </label>
        <label className="chk">
          <input type="checkbox" name="notify_push" defaultChecked={settings.notify_push} /> Obaveštenja na telefon
        </label>
      </div>
      {state.msg ? (
        <div className={'alert ' + (state.ok ? 'alert-ok' : 'alert-err')} role="status">
          {state.msg}
        </div>
      ) : null}
      <button className="btn btn-dark" disabled={pending} style={{ alignSelf: 'flex-start' }}>
        {pending ? 'Čuvam…' : 'Sačuvaj'}
      </button>
    </form>
  );
}
