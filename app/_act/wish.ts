'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/** Jedan klik: dodaj karticu iz spiska (ili upisan tekst) na listu želja. */
export async function quickWish(form: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const back = String(form.get('back') || '/lista-zelja');
  if (!user) redirect(`/prijava?next=${encodeURIComponent(back)}`);
  const catalogId = String(form.get('catalog_id') || '') || null;
  const query = String(form.get('query') || '').trim().slice(0, 160) || null;
  if (!catalogId && !query) return;
  let dup = supabase.from('wishlist').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  dup = catalogId ? dup.eq('catalog_id', catalogId) : dup.eq('query', query!);
  const { count } = await dup;
  if (!count) await supabase.from('wishlist').insert({ user_id: user.id, catalog_id: catalogId, query, is_public: false });
  revalidatePath('/lista-zelja');
  revalidatePath('/kolekcija');
}
