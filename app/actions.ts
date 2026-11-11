'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type State = { ok: boolean; msg: string };

export async function addToCart(_: State, form: FormData): Promise<State> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, msg: 'Prijavi se da bi dodao u korpu.' };
  const productId = String(form.get('product_id') || '');
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();
  const { error } = existing
    ? await supabase.from('cart_items').update({ quantity: existing.quantity + 1 }).eq('id', existing.id)
    : await supabase.from('cart_items').insert({ user_id: user.id, product_id: productId, quantity: 1 });
  if (error) return { ok: false, msg: 'Nije uspelo dodavanje u korpu.' };
  revalidatePath('/', 'layout');
  return { ok: true, msg: 'Dodato u korpu.' };
}

export async function updateCartQty(form: FormData) {
  const supabase = await createClient();
  const id = String(form.get('id'));
  const qty = Number(form.get('quantity'));
  if (!qty || qty < 1) await supabase.from('cart_items').delete().eq('id', id);
  else await supabase.from('cart_items').update({ quantity: Math.min(qty, 50) }).eq('id', id);
  revalidatePath('/', 'layout');
}

export async function removeCartItem(form: FormData) {
  const supabase = await createClient();
  await supabase.from('cart_items').delete().eq('id', String(form.get('id')));
  revalidatePath('/', 'layout');
}

export async function placeOrder(_: State, form: FormData): Promise<State> {
  const supabase = await createClient();
  const g = (k: string) => String(form.get(k) ?? '').trim();
  const shipping = g('shipping') === 'pickup' ? 'pickup' : 'courier';
  const payment = g('payment') || 'ips_qr';
  const { data, error } = await supabase.rpc('place_official_order_v2', {
    p_shipping: shipping,
    p_payment: payment,
    p_promo: g('promo'),
    p_name: g('name'),
    p_phone: g('phone'),
    p_address: [g('address'), g('city')].filter(Boolean).join(', '),
  });
  if (error) return { ok: false, msg: error.message.replace(/^.*?ERROR:\s*/, '') };
  revalidatePath('/', 'layout');
  redirect(`/korpa/potvrda/${data.id}`);
}

export async function checkPromo(code: string): Promise<number | null> {
  const supabase = await createClient();
  if (!code.trim()) return null;
  const { data } = await supabase.rpc('check_promo', { p_code: code });
  return typeof data === 'number' ? data : null;
}

export async function updateProfile(_: State, form: FormData): Promise<State> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, msg: 'Nisi prijavljen.' };
  const sports = form.getAll('sports').map(String);
  const { error: e1 } = await supabase
    .from('profiles')
    .update({
      display_name: String(form.get('display_name') || '').slice(0, 60) || null,
      city: String(form.get('city') || '').slice(0, 60) || null,
      bio: String(form.get('bio') || '').slice(0, 500) || null,
    })
    .eq('id', user.id);
  const { error: e2 } = await supabase.from('user_settings').upsert({
    user_id: user.id,
    script: form.get('script') === 'cyrillic' ? 'cyrillic' : 'latin',
    sports,
    notify_email: form.get('notify_email') === 'on',
    notify_push: form.get('notify_push') === 'on',
  });
  if (e1 || e2) return { ok: false, msg: 'Čuvanje nije uspelo.' };
  revalidatePath('/', 'layout');
  return { ok: true, msg: 'Sačuvano.' };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
