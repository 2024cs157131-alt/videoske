'use client';
import { useState } from 'react';
import { postJSON } from '@/lib/client';
import { REPORT_CATEGORIES, type ReportCategory } from '@/lib/reports';

export default function ReportButton({ videoId }: { videoId: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory>('SEXUAL');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return <span className="muted small">Thanks – reported.</span>;
  if (!open)
    return (
      <button className="btn ghost small" onClick={() => setOpen(true)}>
        ⚑ Report
      </button>
    );

  return (
    <form
      className="card-panel stack"
      style={{ width: '100%', maxWidth: 420 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await postJSON(`/api/videos/${videoId}/report`, { category, reason });
          setDone(true);
        } catch (err) {
          alert((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <strong>What’s wrong with this video?</strong>
      <select value={category} onChange={(e) => setCategory(e.target.value as ReportCategory)}>
        {(Object.keys(REPORT_CATEGORIES) as ReportCategory[]).map((k) => (
          <option key={k} value={k}>
            {REPORT_CATEGORIES[k]}
          </option>
        ))}
      </select>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Details (optional)" maxLength={500} />
      <div className="row">
        <button className="btn small danger" disabled={busy}>
          Send report
        </button>
        <button type="button" className="btn small ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
