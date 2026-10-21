'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { postJSON } from '@/lib/client';

type Msg = { id: string; senderId: string; body: string; createdAt: string };

export default function ChatThread({ meId, partnerId }: { meId: string; partnerId: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const lastRef = useRef<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ with: partnerId });
    if (lastRef.current) q.set('after', lastRef.current);
    const res = await fetch(`/api/messages?${q}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data: { messages: Msg[] } = await res.json();
    if (data.messages.length) {
      lastRef.current = data.messages[data.messages.length - 1].createdAt;
      setMsgs((m) => {
        const ids = new Set(m.map((x) => x.id));
        return [...m, ...data.messages.filter((x) => !ids.has(x.id))];
      });
    }
  }, [partnerId]);

  // Simple polling every 3s – works on Vercel without websockets
  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      await postJSON('/api/messages', { to: partnerId, body });
      setText('');
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chat-box">
      <div className="chat-msgs" ref={boxRef}>
        {msgs.length === 0 && <p className="muted">Say hi 👋</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`bubble ${m.senderId === meId ? 'mine' : ''}`}>
            {m.body}
            <time>{new Date(m.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</time>
          </div>
        ))}
      </div>
      <form className="chat-form" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" maxLength={2000} />
        <button className="btn" disabled={sending}>
          Send
        </button>
      </form>
    </div>
  );
}
