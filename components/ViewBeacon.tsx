'use client';
import { useEffect } from 'react';

// Counts one view when a post is opened (videos count when they start playing)
export default function ViewBeacon({ id }: { id: string }) {
  useEffect(() => {
    const key = `vk_viewed_${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {}
    fetch(`/api/videos/${id}/view`, { method: 'POST', keepalive: true }).catch(() => {});
  }, [id]);
  return null;
}
