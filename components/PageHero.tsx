import RotatingVideo from './RotatingVideo';

export default function PageHero({
  kicker,
  title,
  lead,
  badge,
  children,
  video,
}: {
  kicker?: string;
  title: string;
  lead?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  /** kategorija videa za pozadinu (football, f1, nba, nfl, mix) */
  video?: string;
}) {
  return (
    <section className={'phero' + (video ? ' phero-video' : '')}>
      {video ? (
        <>
          <RotatingVideo key={video} category={video} />
          <div className="phero-shade" aria-hidden="true" />
        </>
      ) : (
        <div className="phero-dots" aria-hidden="true" />
      )}
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
