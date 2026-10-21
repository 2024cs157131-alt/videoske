'use client';
import '@livekit/components-styles';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LiveKitRoom, VideoConference, useLocalParticipant } from '@livekit/components-react';

// Pending "end stream" timers – lets React's dev double-mount cancel the end instead of ending the stream
const pendingEnds = new Map<string, ReturnType<typeof setTimeout>>();

/** Host only: switching to another tab/app pauses camera + mic; coming back resumes them. */
function PauseWhenHidden() {
  const { localParticipant } = useLocalParticipant();
  useEffect(() => {
    const onChange = () => {
      const on = !document.hidden;
      localParticipant.setCameraEnabled(on).catch(() => {});
      localParticipant.setMicrophoneEnabled(on).catch(() => {});
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, [localParticipant]);
  return null;
}

export default function LiveRoom({
  streamId,
  isHost,
  initialStatus,
}: {
  streamId: string;
  isHost: boolean;
  initialStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
}) {
  const [conn, setConn] = useState<{ token: string; url: string } | null>(null);
  const [error, setError] = useState('');
  const [left, setLeft] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    fetch(`/api/live/${streamId}/token`, { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not join stream');
        setConn(d);
      })
      .catch((e) => setError(e.message));
  }, [streamId]);

  // Host: heartbeat every 20s (stream auto-ends ~2 min after the host closes the tab or loses connection),
  // and end the stream as soon as the host navigates to another page on the site.
  useEffect(() => {
    if (!isHost) return;
    const t = pendingEnds.get(streamId);
    if (t) {
      clearTimeout(t);
      pendingEnds.delete(streamId);
    }
    const beat = async () => {
      try {
        const r = await fetch(`/api/live/${streamId}/heartbeat`, { method: 'POST' });
        const d = await r.json();
        if (d.status) setStatus(d.status);
        if (d.isLive === false) setEnded(true);
      } catch {}
    };
    beat();
    const iv = setInterval(beat, 20_000);
    return () => {
      clearInterval(iv);
      pendingEnds.set(
        streamId,
        setTimeout(() => {
          pendingEnds.delete(streamId);
          fetch(`/api/live/${streamId}/end`, { method: 'POST', keepalive: true }).catch(() => {});
        }, 300),
      );
    };
  }, [isHost, streamId]);

  if (ended || status === 'REJECTED') {
    return (
      <div className="error">
        This stream was ended{status === 'REJECTED' ? ' by an admin' : ''}.{' '}
        <Link href="/live" style={{ textDecoration: 'underline' }}>
          Back to live
        </Link>
      </div>
    );
  }
  if (error) return <div className="error">{error}</div>;
  if (left) return <div className="card-panel">You left the stream. Refresh to rejoin.</div>;
  if (!conn) return <div className="card-panel muted">Connecting…</div>;

  return (
    <div className="stack">
      {isHost && status === 'PENDING' && (
        <div className="success">
          ⏳ Waiting for admin approval – only admins can see you right now. Viewers can join as soon as it’s approved.
          Your stream pauses if you switch apps and ends if you leave this page.
        </div>
      )}
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
          {isHost && <PauseWhenHidden />}
          {/* Includes video grid, controls and built-in live chat */}
          <VideoConference />
        </LiveKitRoom>
      </div>
    </div>
  );
}
