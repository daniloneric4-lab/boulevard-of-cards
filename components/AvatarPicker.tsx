'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAvatar } from '@/app/_act/account';
import { createClient } from '@/lib/supabase/client';
import { avatarUrl, initials } from '@/lib/format';

// Iseče sliku na kvadrat iz sredine i smanji na 512 px, pa je odmah pošalje.
async function square(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const c = document.createElement('canvas');
  c.width = c.height = Math.min(512, side);
  c.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, c.width, c.height);
  const out = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.88));
  if (!out) throw new Error('canvas');
  return out;
}

export default function AvatarPicker({ userId, current, name }: { userId: string; current: string | null; name: string }) {
  const [url, setUrl] = useState<string | null>(avatarUrl(current));
  const router = useRouter();
  const [st, setSt] = useState<'' | 'busy' | 'ok' | 'err'>('');
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setSt('busy');
    try {
      const blob = await square(f);
      const sb = createClient();
      const path = `${userId}/avatar-${Date.now()}.jpg`;
      const { error } = await sb.storage.from('listing-images').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
      const pub = sb.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
      const r = await setAvatar(pub);
      if (!r.ok) throw new Error(r.msg);
      setUrl(pub);
      setSt('ok');
      router.refresh();
    } catch {
      setSt('err');
    }
  };
  return (
    <div className="row" style={{ gap: 16, alignItems: 'center' }}>
      <span className="ava" style={{ width: 84, height: 84, fontSize: 28, flex: 'none' }}>
        {url ? <img src={url} alt="" /> : initials(name)}
      </span>
      <div className="stack" style={{ gap: 6 }}>
        <label className="btn btn-dark btn-sm" style={{ alignSelf: 'flex-start', cursor: 'pointer' }}>
          {url ? 'Promeni sliku' : 'Dodaj sliku profila'}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {st === 'busy' ? <span className="muted" style={{ fontSize: 13 }}>Šaljem sliku…</span> : null}
        {st === 'ok' ? <span style={{ fontSize: 13, color: 'var(--bc-green)' }}>✓ Slika profila je sačuvana.</span> : null}
        {st === 'err' ? <span style={{ fontSize: 13, color: '#8a1c13' }}>Slika nije poslata. Probaj drugu (JPG, PNG ili WEBP).</span> : null}
        {!st ? <span className="muted" style={{ fontSize: 12 }}>Slika se sama iseče na kvadrat.</span> : null}
      </div>
    </div>
  );
}
