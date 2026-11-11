import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SubmitButton from '@/components/SubmitButton';
import { updateUser } from '../actions';
import { date } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from('profiles').select('id, username, display_name, city, role, is_verified, is_suspended, created_at').order('created_at', { ascending: false }).limit(200);
  if (q) query = query.or(`username.ilike.%${q.replace(/[%_,()]/g, '')}%,display_name.ilike.%${q.replace(/[%_,()]/g, '')}%`);
  const { data: users } = await query;
  return (
    <>
      <div className="stack" style={{ gap: 6 }}>
        <h1 style={{ fontSize: 36 }}>Korisnici</h1>
        <p className="muted">Verifikacija prodavaca i suspenzije. Admin ulogu dodeljuje samo vlasnik naloga Boulevard of Cards (lista admin e-pošta u bazi).</p>
      </div>
      <form className="row" action="/admin/korisnici">
        <input className="inp" name="q" defaultValue={q ?? ''} placeholder="Korisničko ime ili ime" style={{ maxWidth: 360 }} />
        <button className="btn btn-dark">Traži</button>
      </form>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Korisnik</th>
              <th>Grad</th>
              <th>Član od</th>
              <th>Uloga</th>
              <th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id} style={u.is_suspended ? { opacity: 0.6 } : undefined}>
                <td>
                  <Link href={`/u/${u.username}`} className="lnk">
                    @{u.username}
                  </Link>
                  {u.is_verified ? ' ✓' : ''}
                  <div className="muted" style={{ fontSize: 12 }}>
                    {u.display_name}
                  </div>
                </td>
                <td>{u.city ?? '—'}</td>
                <td className="mono">{date(u.created_at)}</td>
                <td>{u.role === 'admin' ? <span className="pill pill-red">Admin</span> : 'Korisnik'}</td>
                <td>
                  <div className="row" style={{ gap: 6 }}>
                    <form action={updateUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="is_verified" value={u.is_verified ? '0' : '1'} />
                      <SubmitButton className="btn btn-sm btn-ghost">{u.is_verified ? 'Skini verifikaciju' : 'Verifikuj prodavca'}</SubmitButton>
                    </form>
                    {u.role !== 'admin' ? (
                      <form action={updateUser}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="is_suspended" value={u.is_suspended ? '0' : '1'} />
                        <SubmitButton className={'btn btn-sm ' + (u.is_suspended ? 'btn-dark' : 'btn-ghost')}>{u.is_suspended ? 'Vrati nalog' : 'Suspenduj'}</SubmitButton>
                      </form>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
