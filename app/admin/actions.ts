'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type State = { ok: boolean; msg: string };
const ok = (msg: string): State => ({ ok: true, msg });
const fail = (msg: string): State => ({ ok: false, msg });

const toCents = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').replace(/\s/g, '').replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};
const int = (v: FormDataEntryValue | null, d = 0) => {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : d;
};

export async function saveProduct(_: State, form: FormData): Promise<State> {
  const supabase = await createClient();
  const id = String(form.get('id') || '');
  const row: Record<string, unknown> = {
    name: String(form.get('name') || '').trim(),
    kind: String(form.get('kind') || 'sealed_box'),
    sport: String(form.get('sport') || 'other'),
    mode: String(form.get('mode') || 'in_stock'),
    price_cents: toCents(form.get('price')),
    low_stock_at: int(form.get('low_stock_at'), 3),
    max_per_order: form.get('max_per_order') ? int(form.get('max_per_order')) : null,
    description: String(form.get('description') || '').trim() || null,
    is_visible: form.get('is_visible') === 'on',
  };
  if (!row.name) return fail('Unesi naziv proizvoda.');
  if (!id) row.stock = Math.max(0, int(form.get('stock'), 0));

  const file = form.get('image') as File | null;
  if (file && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) return fail('Slika je veća od 5 MB.');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) return fail('Slika nije otpremljena: ' + upErr.message);
    row.image_path = path;
  }

  const { error } = id ? await supabase.from('products').update(row).eq('id', id) : await supabase.from('products').insert(row);
  if (error) return fail(error.message);
  revalidatePath('/', 'layout');
  return ok(id ? 'Proizvod je sačuvan.' : 'Proizvod je dodat.');
}

export async function adjustStock(form: FormData) {
  const supabase = await createClient();
  const id = String(form.get('id'));
  const stock = Math.max(0, int(form.get('stock'), 0));
  await supabase.from('products').update({ stock }).eq('id', id);
  revalidatePath('/', 'layout');
}

export async function addReceipt(_: State, form: FormData): Promise<State> {
  const supabase = await createClient();
  const { error } = await supabase.from('stock_receipts').insert({
    product_id: String(form.get('product_id')),
    quantity_expected: Math.max(1, int(form.get('quantity_expected'), 1)),
    supplier: String(form.get('supplier') || '') || null,
    tracking_number: String(form.get('tracking_number') || '') || null,
    expected_at: String(form.get('expected_at') || '') || null,
    note: String(form.get('note') || '') || null,
  });
  if (error) return fail(error.message);
  revalidatePath('/admin', 'layout');
  return ok('Pošiljka je upisana. Kad stigne, klikni „Stiglo“.');
}

export async function receiveStock(form: FormData) {
  const supabase = await createClient();
  await supabase.rpc('receive_stock', { p_receipt_id: String(form.get('id')), p_quantity: Math.max(0, int(form.get('quantity'), 0)) });
  revalidatePath('/', 'layout');
}

export async function updateOrder(_: State, form: FormData): Promise<State> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('admin_update_order', {
    p_order_id: String(form.get('id')),
    p_status: String(form.get('status')),
    p_tracking: String(form.get('tracking') || ''),
    p_video_path: null,
  });
  if (error) return fail(error.message);
  revalidatePath('/admin', 'layout');
  return ok('Sačuvano.');
}

export async function reviewRelease(form: FormData) {
  const supabase = await createClient();
  await supabase.rpc('review_release', { p_release_id: String(form.get('id')), p_approve: form.get('approve') === '1' });
  revalidatePath('/', 'layout');
}

export async function reviewReleaseUpdate(form: FormData) {
  const supabase = await createClient();
  await supabase.rpc('review_release_update', { p_update_id: String(form.get('id')), p_approve: form.get('approve') === '1' });
  revalidatePath('/', 'layout');
}

export async function saveSettings(_: State, form: FormData): Promise<State> {
  const supabase = await createClient();
  const num = (k: string) => {
    const s = String(form.get(k) ?? '').replace(',', '.').trim();
    return s === '' ? null : Number(s);
  };
  const { error } = await supabase
    .from('platform_settings')
    .update({
      commission_percent: num('commission_percent') ?? 8,
      deposit_percent: num('deposit_percent') ?? 30,
      pay_window_hours: num('pay_window_hours') ?? 24,
      auction_extend_seconds: num('auction_extend_seconds') ?? 120,
      eur_rsd_rate: num('eur_rsd_rate'),
      usd_rsd_rate: num('usd_rsd_rate'),
      shipping_cents: toCents(form.get('shipping')) ?? 0,
      free_shipping_from_cents: toCents(form.get('free_shipping_from')),
      banner_text: String(form.get('banner_text') || '').trim() || null,
      banner_on: form.get('banner_on') === 'on',
      maintenance: form.get('maintenance') === 'on',
      updated_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .eq('id', 1);
  if (error) return fail(error.message);
  revalidatePath('/', 'layout');
  return ok('Podešavanja su sačuvana.');
}
