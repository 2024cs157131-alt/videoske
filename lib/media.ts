'use client';
// Runs in the uploader's browser: makes a thumbnail image and a short trailer clip from the chosen video,
// so nothing heavy has to run on the server.

function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.src = URL.createObjectURL(file);
    v.onloadedmetadata = () => resolve(v);
    v.onerror = () => reject(new Error('Could not read this video in the browser'));
  });
}

function seek(v: HTMLVideoElement, t: number) {
  return new Promise<void>((resolve) => {
    const done = () => {
      v.removeEventListener('seeked', done);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, 5000); // some browsers skip 'seeked' – never hang
    v.addEventListener('seeked', done);
    v.currentTime = t;
  });
}

/** Resolve with null if `p` takes longer than `ms` – the upload must never get stuck on a preview. */
function withTimeout<T>(p: Promise<T | null>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

function startPoint(duration: number, len: number) {
  return duration > len * 2 ? Math.min(duration * 0.15, duration - len) : 0;
}

/** JPEG frame from ~15% into the video. */
export function makeThumbnail(file: File): Promise<File | null> {
  return withTimeout(thumbnail(file), 20_000);
}

async function thumbnail(file: File): Promise<File | null> {
  try {
    const v = await loadVideo(file);
    await seek(v, startPoint(v.duration || 0, 1) || Math.min(1, (v.duration || 1) / 2));
    const w = Math.min(1280, v.videoWidth || 1280);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = Math.round((w * (v.videoHeight || 720)) / (v.videoWidth || 1280));
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.82));
    URL.revokeObjectURL(v.src);
    return blob ? new File([blob], 'thumb.jpg', { type: 'image/jpeg' }) : null;
  } catch {
    return null;
  }
}

/** Silent ~8 second, 480px-wide trailer clip. Returns null if the browser can't record video. */
export function makeTrailer(file: File, seconds = 8): Promise<File | null> {
  return withTimeout(trailer(file, seconds), (seconds + 25) * 1000);
}

async function trailer(file: File, seconds: number): Promise<File | null> {
  if (typeof MediaRecorder === 'undefined') return null;
  const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((t) =>
    MediaRecorder.isTypeSupported(t),
  );
  if (!type) return null;
  try {
    const v = await loadVideo(file);
    const duration = v.duration;
    if (!isFinite(duration) || duration <= 0) return null;
    const start = startPoint(duration, seconds);
    const len = Math.min(seconds, duration - start);
    await seek(v, start);

    const c = document.createElement('canvas');
    c.width = 480;
    c.height = Math.round((480 * (v.videoHeight || 270)) / (v.videoWidth || 480)) & ~1;
    const ctx = c.getContext('2d')!;
    const stream = (c as HTMLCanvasElement & { captureStream(fps: number): MediaStream }).captureStream(24);
    const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 700_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise<void>((r) => (rec.onstop = () => r()));

    let timer = 0;
    const draw = () => ctx.drawImage(v, 0, 0, c.width, c.height);
    await v.play();
    draw();
    timer = window.setInterval(draw, 1000 / 24);
    rec.start(500);
    await new Promise((r) => setTimeout(r, len * 1000));
    rec.stop();
    v.pause();
    clearInterval(timer);
    await stopped;
    URL.revokeObjectURL(v.src);

    const blob = new Blob(chunks, { type: type.split(';')[0] });
    if (blob.size < 2000) return null;
    return new File([blob], `trailer.${type.startsWith('video/mp4') ? 'mp4' : 'webm'}`, { type: blob.type });
  } catch {
    return null;
  }
}
