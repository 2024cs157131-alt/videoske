import type { MetadataRoute } from 'next';

// Lets people "Add to Home screen" on their phone and open Vidaake like an app
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vidaake',
    short_name: 'Vidaake',
    description: 'Videos & live from creators you love',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f0f12',
    theme_color: '#0f0f12',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
