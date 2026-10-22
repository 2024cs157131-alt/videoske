// "KSh 1,250  ▲ 24% vs previous" style comparison row
export default function Compare({
  label,
  cur,
  prev,
  change,
  money,
  kesPerToken = 1,
}: {
  label: string;
  cur: number;
  prev: number;
  change: number | null;
  money?: boolean;
  kesPerToken?: number;
}) {
  const fmt = (n: number) => (money ? `KSh ${Math.floor(n * kesPerToken).toLocaleString()}` : n.toLocaleString());
  const dir = change === null ? 'new' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  return (
    <div className="cmp-row">
      <span className="muted small cmp-label">{label}</span>
      <strong className="cmp-val">{fmt(cur)}</strong>
      <span className={`cmp-chg ${dir}`} title={`Previous period: ${fmt(prev)}`}>
        {dir === 'new' ? (cur > 0 ? '★ new' : '–') : dir === 'flat' ? '= 0%' : `${dir === 'up' ? '▲' : '▼'} ${Math.abs(change!)}%`}
      </span>
    </div>
  );
}
