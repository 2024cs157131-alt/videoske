'use client';
import { useRef } from 'react';

// Full video player that counts one view per video per browser session, when playback starts
export default function VideoPlayer({ id, src, poster }: { id: string; src: string; poster?: string }) {
  const counted = useRef(false);

  function onPlay() {
    if (counted.current) return;
    counted.current = true;
    const key = `vk_viewed_${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {}
    fetch(`/api/videos/${id}/view`, { method: 'POST', keepalive: true }).catch(() => {});
  }

  return <video src={src} poster={poster} controls controlsList="nodownload" playsInline onPlay={onPlay} />;
}
