// /manifest.json route - Web App Manifest for PWA and Google
import { NextResponse } from 'next/server';

// ============================================================================
// FAVICON AYARLARI - CPANEL'DE BU DOSYAYI DEĞİŞTİRİN
// ============================================================================
const FAVICON_PATH = '/uploads/favicon/2bbe8446-e4c4-47bd-9cf1-1d5eedea2b32.png';
// ============================================================================

export async function GET() {
  const manifest = {
    name: 'PINLY – Dijital Kod ve Oyun Satış Platformu',
    short_name: 'PINLY',
    description: 'PINLY üzerinden oyun içi kodlar ve dijital pinler anında teslim edilir. Güvenli ödeme, hızlı teslimat.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#f97316',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'tr',
    icons: [
      {
        src: FAVICON_PATH,
        sizes: '16x16',
        type: 'image/png'
      },
      {
        src: FAVICON_PATH,
        sizes: '32x32',
        type: 'image/png'
      },
      {
        src: FAVICON_PATH,
        sizes: '48x48',
        type: 'image/png'
      },
      {
        src: FAVICON_PATH,
        sizes: '72x72',
        type: 'image/png'
      },
      {
        src: FAVICON_PATH,
        sizes: '96x96',
        type: 'image/png'
      },
      {
        src: FAVICON_PATH,
        sizes: '144x144',
        type: 'image/png'
      },
      {
        src: FAVICON_PATH,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: FAVICON_PATH,
        sizes: '256x256',
        type: 'image/png'
      },
      {
        src: FAVICON_PATH,
        sizes: '384x384',
        type: 'image/png'
      },
      {
        src: FAVICON_PATH,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  };
  
  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
