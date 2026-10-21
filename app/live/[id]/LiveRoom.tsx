'use client';
import '@livekit/components-styles';
import { useEffect, useState } from 'react';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';

export default function LiveRoom({ streamId, isHost }: { streamId: string; isHost: boolean }) {
  const [conn, setConn] = useState<{ token: string; url: string } | null>(null);
  const [error, setError] = useState('');
  const [left, setLeft] = useState(false);

  useEffect(() => {
    fetch(`/api/live/${streamId}/token`, { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not join stream');
        setConn(d);
      })
      .catch((e) => setError(e.message));
  }, [streamId]);

  if (error) return <div className="error">{error}</div>;
  if (left) return <div className="card-panel">You left the stream. Refresh to rejoin.</div>;
  if (!conn) return <div className="card-panel muted">Connecting…</div>;

  return (
    <div style={{ height: '72vh', borderRadius: 12, overflow: 'hidden' }}>
      <LiveKitRoom
        serverUrl={conn.url}
        token={conn.token}
        connect
        video={isHost}
        audio={isHost}
        data-lk-theme="default"
        style={{ height: '100%' }}
        onDisconnected={() => setLeft(true)}
      >
        {/* Includes video grid, controls and built-in live chat */}
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
