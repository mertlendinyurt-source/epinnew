// /apple-touch-icon.png route - Redirects to dynamic favicon from admin panel
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URL = process.env.MONGO_URL;

export async function GET() {
  try {
    // Get favicon from site settings
    const client = await MongoClient.connect(MONGO_URL);
    const db = client.db();
    const settings = await db.collection('site_settings').findOne({ active: true });
    await client.close();
    
    // If favicon is set in admin panel, redirect to it
    if (settings?.favicon) {
      return NextResponse.redirect(new URL(settings.favicon, process.env.NEXT_PUBLIC_BASE_URL || 'https://pinly.com.tr'), {
        status: 302,
        headers: {
          'Cache-Control': 'public, max-age=86400', // 24 hour cache
        }
      });
    }
    
    // Fallback: return 404
    return new NextResponse(null, { status: 404 });
  } catch (error) {
    console.error('Apple touch icon route error:', error);
    return new NextResponse(null, { status: 404 });
  }
}
