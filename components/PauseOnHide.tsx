'use client';
import { useEffect } from 'react';

// When the user switches tab/app or locks the phone, pause every playing video on the page.
// (Leaving a page on the site removes its videos, which stops them.) Live rooms handle themselves.
export default function PauseOnHide() {
  useEffect(() => {
    const onChange = () => {
      if (!document.hidden) return;
      document.querySelectorAll('video').forEach((v) => {
        if (!v.paused && !v.closest('[data-lk-theme]')) v.pause();
      });
    };
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return null;
}
