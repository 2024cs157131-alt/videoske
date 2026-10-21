'use client';
import { useEffect, useRef } from 'react';

// Greyed-out, silent, looping trailer. Plays only while on screen and while the tab is visible.
export default function Trailer({ src, poster, className = '' }: { src: string; poster?: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    let inView = false;
    const sync = () => {
      if (inView && !document.hidden) v.play().catch(() => {});
      else v.pause();
    };
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      sync();
    });
    io.observe(v);
    document.addEventListener('visibilitychange', sync);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  return <video ref={ref} src={src} poster={poster} muted loop playsInline preload="metadata" className={`greyed ${className}`} />;
}
