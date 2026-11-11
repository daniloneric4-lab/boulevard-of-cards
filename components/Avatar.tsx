import { avatarUrl, initials } from '@/lib/format';

export default function Avatar({ name, url, size = 36 }: { name?: string | null; url?: string | null; size?: number }) {
  const src = avatarUrl(url);
  return (
    <span className="ava" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} aria-hidden="true">
      {src ? <img src={src} alt="" /> : initials(name)}
    </span>
  );
}
