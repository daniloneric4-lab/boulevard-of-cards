import { redirect } from 'next/navigation';
import { getSessionInfo } from '@/lib/supabase/server';

export async function requireUser(next: string) {
  const info = await getSessionInfo();
  if (!info.user) redirect(`/prijava?next=${encodeURIComponent(next)}`);
  return info as typeof info & { user: NonNullable<typeof info.user> };
}
