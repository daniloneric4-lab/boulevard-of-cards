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

/* ===== izvlacenja ===== */
export async function saveDraw(_: State, form: FormData): Promise<State> {
  const supabase = await createClient();
  const id = String(form.get('id') || '');
  const iso = (k: string) => {
    const v = String(form.get(k) || '');
    return v ? new Date(v).toISOString() : null;
  };
  const row = {
    release_id: String(form.get('release_id') || '') || null,
    opens_at: iso('opens_at'),
    closes_at: iso('closes_at'),
    draw_at: iso('draw_at'),
    boxes_available: Math.max(1, int(form.get('boxes_available'), 1)),
    max_per_user: Math.max(1, int(form.get('max_per_user'), 1)),
    price_cents: toCents(form.get('price')),
    currency: 'RSD',
    pay_window_hours: Math.max(1, int(form.get('pay_window_hours'), 24)),
    status: String(form.get('status') || 'scheduled'),
  };
  if (!row.release_id) return fail('Izaberi izdanje.');
  if (!row.opens_at || !row.closes_at) return fail('Unesi kada se prijave otvaraju i zatvaraju.');
  const { error } = id ? await supabase.from('draws').update(row).eq('id', id) : await supabase.from('draws').insert(row);
  if (error) return fail(error.message);
  revalidatePath('/', 'layout');
  return ok(id ? 'Izvlačenje je sačuvano.' : 'Izvlačenje je napravljeno.');
}
export async function setDrawStatus(form: FormData) {
  const supabase = await createClient();
  await supabase.from('draws').update({ status: String(form.get('status')) }).eq('id', String(form.get('id')));
  revalidatePath('/', 'layout');
}
export async function runDraw(form: FormData) {
  const supabase = await createClient();
  await supabase.rpc('run_draw', { p_draw_id: String(form.get('id')) });
  revalidatePath('/', 'layout');
}
export async function setEntryStatus(form: FormData) {
  const supabase = await createClient();
  const id = String(form.get('id'));
  const st = String(form.get('status'));
  if (st === 'forfeit') await supabase.rpc('draw_forfeit', { p_entry_id: id });
  else await supabase.from('draw_entries').update({ status: st }).eq('id', id);
  revalidatePath('/admin/izvlacenja');
}

/* ===== live ===== */
export async function saveLive(_: State, form: FormData): Promise<State> {
  const supabase = await createClient();
  const id = String(form.get('id') || '');
  const starts = String(form.get('starts_at') || '');
  const row = {
    title: String(form.get('title') || '').trim(),
    description: String(form.get('description') || '').trim() || null,
    partner_name: String(form.get('partner_name') || '').trim() || null,
    starts_at: starts ? new Date(starts).toISOString() : null,
    stream_url: String(form.get('stream_url') || '').trim() || null,
    recording_url: String(form.get('recording_url') || '').trim() || null,
    status: String(form.get('status') || 'scheduled'),
    slot_labels: String(form.get('slot_labels') || '').split(',').map((x) => x.trim()).filter(Boolean),
    slot_price_cents: toCents(form.get('slot_price')),
  };
  if (!row.title || !row.starts_at) return fail('Unesi naziv i vreme početka.');
  const { error } = id ? await supabase.from('live_events').update(row).eq('id', id) : await supabase.from('live_events').insert(row);
  if (error) return fail(error.message);
  revalidatePath('/', 'layout');
  return ok('Live je sačuvan.');
}
export async function addPull(_: State, form: FormData): Promise<State> {
  const supabase = await createClient();
  const name = String(form.get('card_name') || '').trim();
  if (!name) return fail('Upiši karticu.');
  const { error } = await supabase.from('live_pulls').insert({ live_event_id: String(form.get('live_event_id')), card_name: name, note: String(form.get('note') || '') || null });
  if (error) return fail(error.message);
  revalidatePath('/live');
  return ok('Upisano. Vidi se odmah na stranici Live.');
}
export async function setSlotStatus(form: FormData) {
  const supabase = await createClient();
  await supabase.from('live_slots').update({ status: String(form.get('status')) }).eq('id', String(form.get('id')));
  revalidatePath('/admin/live');
}

/* ===== korisnici ===== */
export async function updateUser(form: FormData) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (form.has('is_verified')) patch.is_verified = form.get('is_verified') === '1';
  if (form.has('is_suspended')) patch.is_suspended = form.get('is_suspended') === '1';
  const id = String(form.get('id'));
  await supabase.from('profiles').update(patch).eq('id', id);
  await supabase.from('admin_log').insert({ admin_id: (await supabase.auth.getUser()).data.user?.id, action: 'update_user', target_type: 'profile', target_id: id, details: patch });
  revalidatePath('/admin/korisnici');
}

/* ===== sporovi, prijave, isplate ===== */
export async function resolveDispute(_: State, form: FormData): Promise<State> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('resolve_dispute', { p_dispute_id: String(form.get('id')), p_action: String(form.get('action')), p_note: String(form.get('note') || '') });
  if (error) return fail(error.message);
  revalidatePath('/admin', 'layout');
  return ok('Spor je rešen.');
}
export async function handleReport(form: FormData) {
  const supabase = await createClient();
  await supabase.rpc('handle_report', { p_report_id: String(form.get('id')), p_status: String(form.get('status')) });
  revalidatePath('/admin', 'layout');
}
export async function setPayout(form: FormData) {
  const supabase = await createClient();
  await supabase.rpc('set_payout_status', { p_payout_id: String(form.get('id')), p_status: String(form.get('status')), p_note: String(form.get('note') || '') });
  revalidatePath('/admin/isplate');
}
export async function payAllReady() {
  const supabase = await createClient();
  await supabase.rpc('pay_all_ready');
  revalidatePath('/admin/isplate');
}

/* ===== usluge i provere kutija ===== */
export async function updateService(form: FormData) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { status: String(form.get('status')) };
  const q = toCents(form.get('quote'));
  if (q != null) patch.quoted_cents = q;
  const b = String(form.get('batch_code') || '').trim();
  if (b) patch.batch_code = b;
  await supabase.from('service_requests').update(patch).eq('id', String(form.get('id')));
  revalidatePath('/admin/usluge');
}
export async function reviewBoxCheck(form: FormData) {
  const supabase = await createClient();
  await supabase.rpc('review_box_check', { p_check_id: String(form.get('id')), p_approve: form.get('approve') === '1', p_note: String(form.get('note') || '') });
  revalidatePath('/admin/usluge');
}

/* ===== katalog ===== */
export async function saveCatalog(_: State, form: FormData): Promise<State> {
  const supabase = await createClient();
  const g = (k: string) => String(form.get(k) || '').trim();
  const row = {
    sport: g('sport') || 'football',
    year: g('year'),
    set_name: g('set_name'),
    card_number: g('card_number') || null,
    player: g('player'),
    team: g('team') || null,
    parallel: g('parallel') || null,
    print_run: g('print_run') ? int(form.get('print_run')) : null,
    is_rookie: form.get('is_rookie') === 'on',
    is_autograph: form.get('is_autograph') === 'on',
  };
  if (!row.player || !row.set_name || !row.year) return fail('Unesi igrača, set i godinu.');
  const { error } = await supabase.from('card_catalog').insert(row);
  if (error) return fail(error.message);
  revalidatePath('/katalog');
  return ok('Kartica je dodata u katalog.');
}
export async function deleteCatalog(form: FormData) {
  const supabase = await createClient();
  await supabase.from('card_catalog').delete().eq('id', String(form.get('id')));
  revalidatePath('/admin/katalog');
}

/* ===== podrska ===== */
export async function setSupportStatus(form: FormData) {
  const supabase = await createClient();
  await supabase.from('support_messages').update({ status: String(form.get('status')) }).eq('id', String(form.get('id')));
  revalidatePath('/admin', 'layout');
}
