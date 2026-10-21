'use client';
import { useEffect } from 'react';

// Remembers ?ref=username from any page so it's applied when the visitor registers later
export default function RefCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && /^[a-z0-9_]{3,20}$/i.test(ref)) {
      try {
        localStorage.setItem('vk_ref', ref.toLowerCase());
      } catch {}
    }
  }, []);
  return null;
}
