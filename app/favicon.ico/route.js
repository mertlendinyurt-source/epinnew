// /favicon.ico route - Redirects to dynamic favicon from admin panel
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
    
    // Fallback: return a default favicon (transparent 1x1 PNG)
    const defaultFavicon = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAABhSURBVHja7JZBCgAgCAS3/z+6rQ7RAgoqHQroMKDiOKjEYEKAAAH+GsCXnT3wZmEFKEABCvh1gHyswCNvA/4GINcBvg+4C3jrwJuA38cAZx3I94F7HXj/Bsg6cP8N+OoMAHSPD0Eg1iVDAAAAAElFTkSuQmCC', 'base64');
    
    return new NextResponse(defaultFavicon, {
      status: 200,
      headers: {
        'Content-Type': 'image/x-icon',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Favicon route error:', error);
    // Return 404 on error
    return new NextResponse(null, { status: 404 });
  }
}
