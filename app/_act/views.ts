'use server';
import { createClient } from '@/lib/supabase/server';

/** Broji jedno otvaranje oglasa (za sortiranje "Najpopularnije"). Prodavčeva otvaranja se ne broje. */
export async function bumpView(kind: 'listing' | 'product', id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const supabase = await createClient();
  await supabase.rpc('bump_view', { p_kind: kind, p_id: id });
}
