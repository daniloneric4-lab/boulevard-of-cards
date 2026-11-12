'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { toCents } from '@/lib/format';

type State = { ok: boolean; msg: string };
const ok = (msg: string): State => ({ ok: true, msg });
const fail = (msg: string): State => ({ ok: false, msg });
const s = (f: FormData, k: string) => String(f.get(k) ?? '').trim();

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
async function mustUser(next = '/') {
  const r = await me();
  if (!r.user) redirect(`/prijava?next=${encodeURIComponent(next)}`);
  return r as { supabase: typeof r.supabase; user: NonNullable<typeof r.user> };
}
const clean = (m?: string) => (m ? m.replace(/^.*?ERROR:\s*/, '') : 'Nešto nije uspelo. Pokušaj ponovo.');

/* ---------- izvlacenja ---------- */
export async function enterDraw(form: FormData) {
  const id = s(form, 'draw_id');
  const { supabase, user } = await mustUser(`/izvlacenja/${id}`);
  await supabase.from('draw_entries').insert({ draw_id: id, user_id: user.id, open_for_me: form.get('open_for_me') === '1', status: 'entered' });
  revalidatePath(`/izvlacenja/${id}`);
  revalidatePath('/izvlacenja');
}
export async function leaveDraw(form: FormData) {
  const id = s(form, 'draw_id');
  const { supabase, user } = await mustUser(`/izvlacenja/${id}`);
  await supabase.from('draw_entries').delete().eq('draw_id', id).eq('user_id', user.id);
  revalidatePath(`/izvlacenja/${id}`);
}

/* ---------- aukcije i oglasi ---------- */
export async function placeBid(_: State, form: FormData): Promise<State> {
  const id = s(form, 'listing_id');
  const { supabase, user } = await me();
  if (!user) return fail('Prijavi se da bi licitirao.');
  const cents = toCents(form.get('amount'));
  if (!cents) return fail('Unesi iznos ponude.');
  const { error } = await supabase.rpc('place_bid', { p_listing_id: id, p_amount_cents: cents });
  if (error) return fail(clean(error.message));
  revalidatePath(`/oglas/${id}`);
  revalidatePath('/aukcije');
  return ok('Vodiš. Javićemo ti odmah ako te neko nadmaši.');
}
export async function toggleWatch(form: FormData) {
  const id = s(form, 'listing_id');
  const { supabase, user } = await mustUser(`/oglas/${id}`);
  if (form.get('on') === '1') await supabase.from('listing_watches').delete().eq('listing_id', id).eq('user_id', user.id);
  else await supabase.from('listing_watches').insert({ listing_id: id, user_id: user.id });
  revalidatePath(`/oglas/${id}`);
  revalidatePath('/aukcije');
}
export async function acceptBid(form: FormData) {
  const id = s(form, 'listing_id');
  const { supabase } = await mustUser(`/oglas/${id}`);
  const { error } = await supabase.rpc('accept_bid', { p_listing_id: id });
  if (error) redirect(`/oglas/${id}?greska=${encodeURIComponent(clean(error.message))}`);
  revalidatePath(`/oglas/${id}`);
  revalidatePath('/aukcije');
  redirect(`/oglas/${id}?prihvaceno=1`);
}
export async function buyListing(_: State, form: FormData): Promise<State> {
  const { supabase, user } = await me();
  if (!user) return fail('Prijavi se da bi kupio.');
  const { error } = await supabase.rpc('buy_listing', {
    p_listing_id: s(form, 'listing_id'),
    p_shipping: s(form, 'shipping') === 'pickup' ? 'pickup' : 'courier',
    p_payment: s(form, 'payment') || 'bank_transfer',
  });
  if (error) return fail(clean(error.message));
  revalidatePath('/', 'layout');
  redirect('/profil?kupljeno=1');
}

/* ---------- poruke i ponude ---------- */
export async function startConversation(form: FormData) {
  const other = s(form, 'user_id');
  const listing = s(form, 'listing_id') || null;
  const { supabase } = await mustUser(listing ? `/oglas/${listing}` : '/poruke');
  const { data, error } = await supabase.rpc('open_conversation', { p_other: other, p_listing: listing });
  if (error || !data) redirect('/poruke?greska=1');
  redirect(`/poruke/${data}`);
}
export async function sendMessage(form: FormData) {
  const conv = s(form, 'conversation_id');
  const body = s(form, 'body').slice(0, 2000);
  const { supabase, user } = await mustUser(`/poruke/${conv}`);
  if (body) await supabase.from('messages').insert({ conversation_id: conv, sender_id: user.id, kind: 'text', body });
  revalidatePath(`/poruke/${conv}`);
}
export async function sendOffer(_: State, form: FormData): Promise<State> {
  const conv = s(form, 'conversation_id');
  const { supabase, user } = await me();
  if (!user) return fail('Prijavi se.');
  const cents = toCents(form.get('amount'));
  if (!cents) return fail('Unesi iznos ponude.');
  const { data: c } = await supabase.from('conversations').select('buyer_id, seller_id, listing_id').eq('id', conv).single();
  if (!c) return fail('Razgovor ne postoji.');
  const to = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
  const hours = Math.min(72, Math.max(1, parseInt(s(form, 'hours') || '24', 10)));
  const { error } = await supabase.from('offers').insert({
    conversation_id: conv,
    listing_id: c.listing_id,
    from_user: user.id,
    to_user: to,
    amount_cents: cents,
    currency: 'RSD',
    shipping: s(form, 'shipping') === 'pickup' ? 'pickup' : 'courier',
    expires_at: new Date(Date.now() + hours * 3600_000).toISOString(),
    status: 'pending',
  });
  if (error) return fail(clean(error.message));
  revalidatePath(`/poruke/${conv}`);
  return ok('Ponuda je poslata.');
}
export async function respondOffer(form: FormData) {
  const conv = s(form, 'conversation_id');
  const { supabase } = await mustUser(`/poruke/${conv}`);
  await supabase.rpc('respond_offer', {
    p_offer_id: s(form, 'offer_id'),
    p_action: s(form, 'action'),
    p_counter_cents: toCents(form.get('counter')),
  });
  revalidatePath(`/poruke/${conv}`);
}
export async function respondTrade(form: FormData) {
  const conv = s(form, 'conversation_id');
  const { supabase } = await mustUser(`/poruke/${conv}`);
  await supabase.rpc('respond_trade', { p_trade_id: s(form, 'trade_id'), p_action: s(form, 'action') });
  revalidatePath(`/poruke/${conv}`);
}
export async function proposeTrade(_: State, form: FormData): Promise<State> {
  const conv = s(form, 'conversation_id');
  const { supabase, user } = await me();
  if (!user) return fail('Prijavi se.');
  const give = form.getAll('give').map(String);
  const get = form.getAll('get').map(String);
  if (!give.length && !get.length) return fail('Izaberi bar jednu karticu.');
  const { data: c } = await supabase.from('conversations').select('buyer_id, seller_id').eq('id', conv).single();
  if (!c) return fail('Razgovor ne postoji.');
  const to = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
  const { data: t, error } = await supabase
    .from('trades')
    .insert({ conversation_id: conv, proposer_id: user.id, recipient_id: to, topup_cents: toCents(form.get('topup')) ?? 0, currency: 'RSD', status: 'pending' })
    .select('id')
    .single();
  if (error || !t) return fail(clean(error?.message));
  const rows = [...give.map((id) => ({ trade_id: t.id, collection_item_id: id, side: 'give' })), ...get.map((id) => ({ trade_id: t.id, collection_item_id: id, side: 'get' }))];
  const { error: e2 } = await supabase.from('trade_items').insert(rows);
  if (e2) return fail(clean(e2.message));
  revalidatePath(`/poruke/${conv}`);
  return ok('Predlog razmene je poslat.');
}

/* ---------- live ---------- */
export async function reserveSlot(_: State, form: FormData): Promise<State> {
  const { supabase, user } = await me();
  if (!user) return fail('Prijavi se da bi rezervisao mesto.');
  const event = s(form, 'live_event_id');
  const labels = form.getAll('label').map(String).filter(Boolean);
  if (!labels.length) return fail('Izaberi bar jedan tim.');
  const price = parseInt(s(form, 'price_cents') || '0', 10) || null;
  const { error } = await supabase
    .from('live_slots')
    .insert(labels.map((label) => ({ live_event_id: event, user_id: user.id, label, price_cents: price, currency: 'RSD', status: 'reserved' })));
  if (error) return fail('Neko mesto je u međuvremenu zauzeto. Osveži stranicu.');
  revalidatePath('/live');
  return ok(`Rezervisano: ${labels.join(', ')}. Uputstvo za uplatu stiže u obaveštenja.`);
}
export async function toggleReminder(form: FormData) {
  const { supabase, user } = await mustUser('/live');
  const id = s(form, 'live_event_id');
  if (form.get('on') === '1') await supabase.from('live_reminders').delete().eq('live_event_id', id).eq('user_id', user.id);
  else await supabase.from('live_reminders').insert({ live_event_id: id, user_id: user.id });
  revalidatePath('/live');
}

/* ---------- usluge ---------- */
export async function requestService(_: State, form: FormData): Promise<State> {
  const { supabase, user } = await me();
  if (!user) return fail('Prijavi se da bi poslao prijavu.');
  const service = s(form, 'service');
  if (!['grading', 'vault', 'consignment', 'buyback'].includes(service)) return fail('Izaberi uslugu.');
  const raw = s(form, 'notes').slice(0, 2000);
  const item = s(form, 'collection_item_id') || null;
  if (!raw && !item) return fail('Napiši koju karticu šalješ.');
  const opt = s(form, 'opt');
  const notes = opt ? `[${opt}] ${raw}`.trim() : raw;
  const grading = service === 'grading';
  const lines = raw.split('\n').map((x) => x.trim()).filter(Boolean);
  const tier = ['standard', 'priority', 'express'].includes(s(form, 'tier')) ? s(form, 'tier') : 'standard';
  const { error } = await supabase.from('service_requests').insert({
    user_id: user.id,
    service,
    grading_company: grading ? 'psa' : null,
    collection_item_id: item,
    notes: notes || null,
    status: 'submitted',
    currency: 'RSD',
    ...(grading
      ? { tier, cards: raw || null, card_count: Math.min(200, Math.max(1, lines.length + (item && !lines.length ? 1 : 0))), declared_value_cents: toCents(form.get('declared_value')) }
      : {}),
  });
  if (error) return fail(clean(error.message));
  revalidatePath('/kolekcija');
  revalidatePath('/usluge');
  return ok(
    grading
      ? 'Prijava je primljena i ušla je u sledeći paket za PSA. Javljamo ti kad da doneseš kartice i koliko je PSA naknada.'
      : 'Prijava je poslata. Javljamo ti cenu i rok u roku od 24 sata.',
  );
}

/* ---------- kolekcija ---------- */
async function uploadImage(supabase: Awaited<ReturnType<typeof createClient>>, uid: string, file: File | null) {
  if (!file || file.size === 0) return null;
  if (file.size > 4 * 1024 * 1024) throw new Error('Slika je veća od 4 MB. Smanji je ili slikaj u manjoj rezoluciji.');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${uid}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('listing-images').upload(path, file, { contentType: file.type || 'image/jpeg' });
  if (error) throw new Error('Slika nije otpremljena.');
  return path;
}

export async function createListing(_: State, form: FormData): Promise<State> {
  const { supabase, user } = await me();
  if (!user) return fail('Prijavi se da bi objavio oglas.');
  const title = s(form, 'title').slice(0, 160);
  if (title.length < 4) return fail('Upiši naziv kartice (igrač, set, paralela).');
  const mode = s(form, 'mode') || 'fixed';
  const sport = s(form, 'sport') || 'other';
  const isBox = s(form, 'kind') === 'sealed_box';
  const grader = isBox ? 'raw' : s(form, 'grader') || 'raw';
  const grade = grader === 'raw' ? null : Number(s(form, 'grade').replace(',', '.')) || null;
  const price = toCents(form.get('price'));
  if ((mode === 'fixed' || mode === 'auction') && !price) return fail(mode === 'auction' ? 'Unesi početnu cenu.' : 'Unesi cenu.');
  if (price && price > 2_000_000_000) return fail('Najveća cena je 20.000.000 RSD.');
  // slika se šalje iz pregledača odmah po izboru; ovde samo proveravamo da je tvoja i da postoji
  let img: string | null = s(form, 'image_path') || null;
  if (img && !img.startsWith(`${user.id}/`)) img = null;
  if (!img) {
    try {
      img = await uploadImage(supabase, user.id, form.get('image') as File | null);
    } catch (e) {
      return fail((e as Error).message);
    }
  }
  if (!img) return fail('Dodaj sliku kartice. Oglas bez slike ne može da se objavi.');
  const { data: prof } = await supabase.from('profiles').select('city, country').eq('id', user.id).single();
  const { data: item, error: e1 } = await supabase
    .from('collection_items')
    .insert({
      owner_id: user.id,
      title,
      kind: isBox ? 'sealed_box' : grader === 'raw' ? 'card' : 'graded_card',
      grader,
      grade,
      cert_number: s(form, 'cert') || null,
      condition: s(form, 'condition') || null,
      location: 'owner',
      is_public: true,
      open_to_trade: mode === 'trade',
      estimated_value_cents: price,
      currency: 'RSD',
      passport_code: 'BOC-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
    })
    .select('id')
    .single();
  if (e1 || !item) return fail(clean(e1?.message));
  const { data: listing, error: e2 } = await supabase
    .from('listings')
    .insert({
      seller_id: user.id,
      collection_item_id: item.id,
      kind: isBox ? 'sealed_box' : grader === 'raw' ? 'card' : 'graded_card',
      sport,
      title,
      description: s(form, 'description').slice(0, 2000) || null,
      mode,
      status: 'active',
      price_cents: mode === 'showcase' || mode === 'trade' ? null : price,
      currency: 'RSD',
      accepts_offers: mode === 'offers' || form.get('accepts_offers') === 'on',
      city: prof?.city ?? null,
      country: prof?.country ?? 'RS',
    })
    .select('id')
    .single();
  if (e2 || !listing) return fail(clean(e2?.message));
  const { error: eImg } = await supabase.from('listing_images').insert({ listing_id: listing.id, storage_path: img, position: 0 });
  if (eImg) {
    await supabase.from('listings').delete().eq('id', listing.id);
    return fail('Slika nije sačuvana uz oglas. Pokušaj ponovo.');
  }
  if (mode === 'auction') {
    const days = Math.min(14, Math.max(1, parseInt(s(form, 'days') || '7', 10)));
    const { error: e3 } = await supabase.from('auctions').insert({
      listing_id: listing.id,
      start_price_cents: price,
      min_increment_cents: Math.max(10000, Math.round((price ?? 0) * 0.05 / 100) * 100),
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + days * 86400_000).toISOString(),
      extend_window_seconds: 120,
      bid_count: 0,
    });
    if (e3) return fail(clean(e3.message));
  }
  revalidatePath('/', 'layout');
  redirect(`/oglas/${listing.id}?novo=1`);
}

export async function addCollectionItem(_: State, form: FormData): Promise<State> {
  const { supabase, user } = await me();
  if (!user) return fail('Prijavi se.');
  const title = s(form, 'title').slice(0, 160);
  if (title.length < 3) return fail('Upiši naziv kartice.');
  const grader = s(form, 'grader') || 'raw';
  const { error } = await supabase.from('collection_items').insert({
    owner_id: user.id,
    title,
    kind: grader === 'raw' ? 'card' : 'graded_card',
    grader,
    grade: grader === 'raw' ? null : Number(s(form, 'grade').replace(',', '.')) || null,
    location: 'owner',
    is_public: form.get('is_public') === 'on',
    open_to_trade: form.get('open_to_trade') === 'on',
    estimated_value_cents: toCents(form.get('value')),
    currency: 'RSD',
    passport_code: 'BOC-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
  });
  if (error) return fail(clean(error.message));
  revalidatePath('/kolekcija');
  return ok('Kartica je dodata u kolekciju.');
}
export async function updateCollectionItem(form: FormData) {
  const { supabase } = await mustUser('/kolekcija');
  const patch: Record<string, unknown> = {};
  if (form.has('is_public')) patch.is_public = form.get('is_public') === '1';
  if (form.has('open_to_trade')) patch.open_to_trade = form.get('open_to_trade') === '1';
  await supabase.from('collection_items').update(patch).eq('id', s(form, 'id'));
  revalidatePath('/kolekcija');
}
export async function deleteCollectionItem(form: FormData) {
  const { supabase } = await mustUser('/kolekcija');
  await supabase.from('collection_items').delete().eq('id', s(form, 'id'));
  revalidatePath('/kolekcija');
}
export async function addWish(_: State, form: FormData): Promise<State> {
  const { supabase, user } = await me();
  if (!user) return fail('Prijavi se da bi dodao na listu želja.');
  const query = s(form, 'query').slice(0, 160);
  const catalog = s(form, 'catalog_id') || null;
  if (!query && !catalog) return fail('Upiši šta tražiš.');
  const { error } = await supabase.from('wishlist').insert({
    user_id: user.id,
    query: query || null,
    catalog_id: catalog,
    max_price_cents: toCents(form.get('max_price')),
    is_public: false,
  });
  if (error) return fail(clean(error.message));
  revalidatePath('/kolekcija');
  revalidatePath('/lista-zelja');
  return ok('Dodato na listu želja. Javljamo ti kad se pojavi na sajtu.');
}
export async function removeWish(form: FormData) {
  const { supabase } = await mustUser('/kolekcija');
  await supabase.from('wishlist').delete().eq('id', s(form, 'id'));
  revalidatePath('/kolekcija');
  revalidatePath('/lista-zelja');
}
export async function addCatalogToCollection(form: FormData) {
  const id = s(form, 'catalog_id');
  const { supabase, user } = await mustUser(`/katalog/${id}`);
  const { data: c } = await supabase.from('card_catalog').select('*').eq('id', id).single();
  if (c)
    await supabase.from('collection_items').insert({
      owner_id: user.id,
      catalog_id: c.id,
      title: [c.year, c.set_name, c.player, c.parallel].filter(Boolean).join(' · '),
      kind: 'card',
      grader: 'raw',
      location: 'owner',
      is_public: true,
      currency: 'RSD',
      passport_code: 'BOC-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
    });
  revalidatePath(`/katalog/${id}`);
  revalidatePath('/kolekcija');
}

/* ---------- prodavac i porudzbine ---------- */
export async function shipOrder(form: FormData) {
  const { supabase } = await mustUser('/prodavac');
  await supabase.rpc('seller_ship_order', { p_order_id: s(form, 'id'), p_tracking: s(form, 'tracking') });
  revalidatePath('/prodavac');
}
export async function confirmDelivery(form: FormData) {
  const { supabase } = await mustUser('/profil');
  await supabase.rpc('confirm_delivery', { p_order_id: s(form, 'id') });
  revalidatePath('/profil');
}
export async function openDispute(_: State, form: FormData): Promise<State> {
  const { supabase, user } = await me();
  if (!user) return fail('Prijavi se.');
  const reason = s(form, 'reason');
  if (!reason) return fail('Izaberi razlog.');
  const { error } = await supabase.from('disputes').insert({
    order_id: s(form, 'order_id'),
    opened_by: user.id,
    reason,
    description: s(form, 'description').slice(0, 2000) || null,
    status: 'open',
  });
  if (error) return fail(clean(error.message));
  revalidatePath('/profil');
  return ok('Spor je otvoren. Tim Boulevard of Cards ga rešava u roku od 48 sati, a novac čeka do odluke.');
}
export async function setListingStatus(form: FormData) {
  const { supabase } = await mustUser('/prodavac');
  const status = s(form, 'status');
  if (['active', 'cancelled'].includes(status)) await supabase.from('listings').update({ status }).eq('id', s(form, 'id'));
  revalidatePath('/prodavac');
}
export async function setListingPrice(form: FormData) {
  const { supabase } = await mustUser('/prodavac');
  const p = toCents(form.get('price'));
  if (p) await supabase.from('listings').update({ price_cents: p }).eq('id', s(form, 'id'));
  revalidatePath('/prodavac');
}

/* ---------- recenzije, prijave, podrska ---------- */
export async function writeReview(_: State, form: FormData): Promise<State> {
  const { supabase, user } = await me();
  if (!user) return fail('Prijavi se.');
  const rating = parseInt(s(form, 'rating'), 10);
  if (!(rating >= 1 && rating <= 5)) return fail('Izaberi ocenu od 1 do 5.');
  const orderId = s(form, 'order_id');
  const { data: o } = await supabase.from('orders').select('buyer_id, seller_id').eq('id', orderId).single();
  if (!o || !o.seller_id) return fail('Izaberi primljenu porudžbinu.');
  const { error } = await supabase.from('reviews').insert({
    order_id: orderId,
    reviewer_id: user.id,
    reviewee_id: o.buyer_id === user.id ? o.seller_id : o.buyer_id,
    rating,
    comment: s(form, 'comment').slice(0, 1500) || null,
  });
  if (error) return fail(error.code === '23505' ? 'Već si ocenio ovu kupovinu.' : 'Ocenu možeš ostaviti tek kad potvrdiš prijem.');
  revalidatePath('/recenzije');
  return ok('Hvala! Recenzija je objavljena.');
}
export async function reportContent(form: FormData) {
  const { supabase, user } = await mustUser('/');
  await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type: s(form, 'target_type'),
    target_id: s(form, 'target_id'),
    reason: s(form, 'reason') || 'other',
    status: 'open',
  });
  const back = s(form, 'back');
  if (back.startsWith('/')) revalidatePath(back);
}
export async function sendSupport(_: State, form: FormData): Promise<State> {
  const { supabase, user } = await me();
  const email = s(form, 'email');
  const message = s(form, 'message');
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Upiši ispravnu e-poštu.');
  if (message.length < 5) return fail('Napiši poruku.');
  const { error } = await supabase.from('support_messages').insert({ email, topic: s(form, 'topic') || 'other', message: message.slice(0, 4000), user_id: user?.id ?? null });
  if (error) return fail('Poruka nije poslata. Pokušaj ponovo.');
  return ok('Poruka je poslata. Odgovaramo u roku od 24 sata, radnim danima brže.');
}
export async function newsletter(_: State, form: FormData): Promise<State> {
  const { supabase } = await me();
  const email = s(form, 'email').toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Upiši ispravnu e-poštu.');
  const { error } = await supabase.from('newsletter_signups').insert({ email, source: s(form, 'source') || 'home', interests: form.getAll('interests').map(String) });
  if (error && error.code !== '23505') return fail('Upis nije uspeo.');
  return ok('Upisan si. Javljamo ti čim se otvori prijava.');
}

/* ---------- obavestenja i pracenje ---------- */
export async function markAllRead() {
  const { supabase, user } = await mustUser('/obavestenja');
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
  revalidatePath('/', 'layout');
}
export async function deleteNotification(form: FormData) {
  const { supabase, user } = await mustUser('/obavestenja');
  await supabase.from('notifications').delete().eq('id', s(form, 'id')).eq('user_id', user.id);
  revalidatePath('/', 'layout');
}
export async function clearNotifications(form: FormData) {
  const { supabase, user } = await mustUser('/obavestenja');
  let q = supabase.from('notifications').delete().eq('user_id', user.id);
  if (s(form, 'mode') !== 'all') q = q.not('read_at', 'is', null);
  await q;
  revalidatePath('/', 'layout');
}
export async function clearConversation(form: FormData) {
  const id = s(form, 'id');
  const { supabase } = await mustUser('/poruke');
  await supabase.rpc('clear_conversation', { p_conversation_id: id });
  revalidatePath('/', 'layout');
  redirect('/poruke?obrisano=1');
}
export async function markRead(form: FormData) {
  const { supabase } = await mustUser('/obavestenja');
  await supabase.from('notifications').update({ read_at: form.get('unread') === '1' ? null : new Date().toISOString() }).eq('id', s(form, 'id'));
  revalidatePath('/', 'layout');
}
export async function toggleFollow(form: FormData) {
  const id = s(form, 'user_id');
  const back = s(form, 'back') || '/';
  const { supabase, user } = await mustUser(back);
  if (form.get('on') === '1') await supabase.from('follows').delete().eq('follower_id', user.id).eq('followee_id', id);
  else await supabase.from('follows').insert({ follower_id: user.id, followee_id: id });
  revalidatePath(back);
}
