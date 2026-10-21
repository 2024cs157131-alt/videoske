'use client';
import { postJSON } from '@/lib/client';

export default function ReportButton({ videoId }: { videoId: string }) {
  return (
    <button
      className="btn ghost small"
      onClick={async () => {
        const reason = prompt('What is wrong with this video? (e.g. person looks under 18, no consent, stolen content)');
        if (!reason) return;
        try {
          await postJSON(`/api/videos/${videoId}/report`, { reason });
          alert('Thanks – an admin will review this video.');
        } catch (e) {
          alert((e as Error).message);
        }
      }}
    >
      ⚑ Report
    </button>
  );
}
