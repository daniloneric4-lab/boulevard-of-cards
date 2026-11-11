export default function Steps({ at }: { at: number }) {
  return (
    <ol className="steps-pills" aria-label="Koraci porudžbine">
      {['Korpa', 'Dostava i plaćanje', 'Potvrda'].map((l, i) => (
        <li key={l} className={i === at ? 'on' : i < at ? 'done' : undefined} aria-current={i === at ? 'step' : undefined}>
          {i + 1} {l}
        </li>
      ))}
    </ol>
  );
}

