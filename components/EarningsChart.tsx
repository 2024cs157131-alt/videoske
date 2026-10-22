import type { DayEarning } from '@/lib/earnings';

// Bar chart of daily earnings (today highlighted). Pure CSS – nothing extra to download.
export default function EarningsChart({ days, kesPerToken }: { days: DayEarning[]; kesPerToken: number }) {
  const max = Math.max(1, ...days.map((d) => d.amount));
  const ksh = (t: number) => `KSh ${Math.floor(t * kesPerToken).toLocaleString()}`;
  const dense = days.length > 16;
  return (
    <div
      className={`chart ${dense ? 'dense' : ''}`}
      style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}
      role="img"
      aria-label={`Daily earnings for the last ${days.length} days`}
    >
      {days.map((d, i) => (
        <div key={d.key} className={`chart-col ${d.isToday ? 'today' : ''}`} title={`${d.label}: ${ksh(d.amount)}`}>
          <span className="chart-val">{d.amount > 0 && !dense ? Math.floor(d.amount * kesPerToken).toLocaleString() : ''}</span>
          <div className="chart-bar" style={{ height: `${Math.max(2, (d.amount / max) * 100)}%`, animationDelay: `${i * 25}ms` }} />
          <span className="chart-label">{d.isToday ? 'Today' : dense && i % 5 !== 0 ? '' : d.label}</span>
        </div>
      ))}
    </div>
  );
}
