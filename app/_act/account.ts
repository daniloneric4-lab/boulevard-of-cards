'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type State = { ok: boolean; msg: string };

export async function saveAccount(_: State, form: FormData): Promise<State> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, msg: 'Nisi prijavljen.' };
  const g = (k: string) => String(form.get(k) ?? '').trim();
  const username = g('username').toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return { ok: false, msg: 'Korisničko ime: 3–24 mala slova, brojevi ili _.' };
  const patch: Record<string, unknown> = {
    username,
    display_name: g('display_name').slice(0, 60) || username,
    city: g('city').slice(0, 60) || null,
    country: g('country') || 'RS',
    bio: g('bio').slice(0, 500) || null,
    collects: g('collects').slice(0, 200) || null,
  };
  const { error: e1 } = await supabase.from('profiles').update(patch).eq('id', user.id);
  if (e1) return { ok: false, msg: e1.code === '23505' ? 'To korisničko ime je zauzeto.' : 'Čuvanje profila nije uspelo.' };
  const prefs: Record<string, boolean> = {};
  for (const k of ['outbid', 'draw', 'offers', 'shipping', 'wishlist', 'live', 'news']) prefs[k] = form.get('n_' + k) === 'on';
  const { error: e2 } = await supabase.from('user_settings').upsert({
    user_id: user.id,
    script: form.get('script') === 'cyrillic' ? 'cyrillic' : 'latin',
    sports: form.getAll('sports').map(String),
    notify_email: form.get('notify_email') === 'on',
    notify_push: form.get('notify_push') === 'on',
    notify_prefs: prefs,
  });
  if (e2) return { ok: false, msg: 'Čuvanje podešavanja nije uspelo.' };
  revalidatePath('/', 'layout');
  return { ok: true, msg: 'Sačuvano.' };
}

export async function saveOnboarding(form: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/prijava');
  const sports = form.getAll('sports').map(String);
  const follow = String(form.get('follow') ?? '').trim();
  await supabase.from('user_settings').upsert({ user_id: user.id, sports, onboarded_at: new Date().toISOString() });
  if (follow) {
    const items = follow.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 10);
    if (items.length) await supabase.from('wishlist').insert(items.map((q) => ({ user_id: user.id, query: q, is_public: false })));
    await supabase.from('profiles').update({ collects: items.join(', ').slice(0, 200) }).eq('id', user.id);
  }
  revalidatePath('/', 'layout');
  redirect('/?dobrodosao=1');
}

// Slika je već otpremljena iz pregledača; ovde samo upisujemo adresu u profil.
export async function setAvatar(url: string): Promise<State> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, msg: 'Nisi prijavljen.' };
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${user.id}/`;
  if (!url.startsWith(base)) return { ok: false, msg: 'Neispravna slika.' };
  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
  if (error) return { ok: false, msg: 'Slika nije sačuvana.' };
  revalidatePath('/', 'layout');
  return { ok: true, msg: 'Sačuvano.' };
}
