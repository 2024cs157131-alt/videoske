'use client';
import { useEffect, useState } from 'react';

export default function AgeGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('vk_age_ok') !== '1') setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const enter = () => {
    try {
      localStorage.setItem('vk_age_ok', '1');
    } catch {}
    setShow(false);
  };

  return (
    <div className="gate" role="dialog" aria-modal="true">
      <div className="gate-box">
        <div className="eighteen">18+</div>
        <h2 style={{ marginTop: 8 }}>Adults only</h2>
        <p className="muted">
          This website contains age-restricted content. By entering you confirm that you are at least 18 years old and
          that you consent to viewing such content.
        </p>
        <div className="row">
          <button className="btn" onClick={enter}>
            I am 18 or older – Enter
          </button>
          <a className="btn ghost" href="https://www.google.com">
            Leave
          </a>
        </div>
      </div>
    </div>
  );
}
