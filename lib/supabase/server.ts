import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // poziv iz Server Component-a; middleware osvezava sesiju
          }
        },
      },
    }
  );
}

export async function getSessionInfo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null, isAdmin: false };
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, city, role, is_suspended, is_verified, collects')
    .eq('id', user.id)
    .single();
  const isAdmin = !!profile && profile.role === 'admin' && !profile.is_suspended && !!user.email_confirmed_at;
  return { supabase, user, profile, isAdmin };
}
