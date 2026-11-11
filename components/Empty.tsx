import Link from 'next/link';

export default function Empty({ title, text, href, cta }: { title: string; text?: string; href?: string; cta?: string }) {
  return (
    <div className="empty">
      <span className="empty-t">{title}</span>
      {text ? <span className="muted">{text}</span> : null}
      {href && cta ? (
        <Link href={href} className="btn btn-dark">
          {cta}
        </Link>
      ) : null}
    </div>
  );
}
