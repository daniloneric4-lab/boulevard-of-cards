export default function PageHero({
  kicker,
  title,
  lead,
  badge,
  children,
}: {
  kicker?: string;
  title: string;
  lead?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="phero">
      <div className="phero-dots" aria-hidden="true" />
      <div className="phero-in">
        <div className="stack" style={{ gap: 12 }}>
          {badge ? <span className="phero-badge">{badge}</span> : null}
          {kicker ? <span className="kicker">{kicker}</span> : null}
          <h1>{title}</h1>
          {lead ? <p className="phero-lead">{lead}</p> : null}
        </div>
        {children ? <div className="row">{children}</div> : null}
      </div>
    </section>
  );
}
