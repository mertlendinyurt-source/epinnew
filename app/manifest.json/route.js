// /manifest.json route - Dynamic web app manifest
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URL = process.env.MONGO_URL;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://pinly.com.tr';

export async function GET() {
  try {
    // Get site settings
    const client = await MongoClient.connect(MONGO_URL);
    const db = client.db();
    const settings = await db.collection('site_settings').findOne({ active: true });
    await client.close();
    
    const siteName = settings?.siteName || 'PINLY';
    const faviconUrl = settings?.favicon || '/favicon.ico';
    
    const manifest = {
      name: siteName,
      short_name: siteName,
      description: settings?.metaDescription || 'Dijital Kod ve Oyun Satış Platformu',
      start_url: '/',
      display: 'standalone',
      background_color: '#0a0a0a',
      theme_color: '#f97316',
      icons: [
        {
          src: faviconUrl,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: faviconUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    };
    
    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Manifest route error:', error);
    // Return basic manifest on error
    return NextResponse.json({
      name: 'PINLY',
      short_name: 'PINLY',
      start_url: '/',
      display: 'standalone',
      background_color: '#0a0a0a',
      theme_color: '#f97316'
    }, {
      headers: {
        'Content-Type': 'application/manifest+json',
      },
    });
  }
}
