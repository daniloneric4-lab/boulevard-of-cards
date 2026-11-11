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
  const file = form.get('avatar') as File | null;
  if (file && file.size > 0) {
    if (file.size > 3 * 1024 * 1024) return { ok: false, msg: 'Slika profila je veća od 3 MB.' };
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true });
    if (error) return { ok: false, msg: 'Slika profila nije otpremljena.' };
    patch.avatar_url = path;
  }
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
