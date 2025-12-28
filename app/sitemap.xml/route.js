import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'pinly_store';
const BASE_URL = 'https://pinly.com.tr';

export async function GET() {
  try {
    const client = new MongoClient(MONGO_URL);
    await client.connect();
    const db = client.db(DB_NAME);

    // Get all products
    const products = await db.collection('products').find({ isActive: true }).toArray();
    
    // Get site settings for lastmod
    const siteSettings = await db.collection('site_settings').findOne({ active: true });
    
    await client.close();

    const today = new Date().toISOString().split('T')[0];

    // Build sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Ana Sayfa -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <!-- Kurumsal Sayfalar -->
  <url>
    <loc>${BASE_URL}/hizmet-sartlari</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${BASE_URL}/gizlilik-politikasi</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${BASE_URL}/kvkk</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${BASE_URL}/iade-politikasi</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

`;

    // Add product URLs
    for (const product of products) {
      const productDate = product.updatedAt ? new Date(product.updatedAt).toISOString().split('T')[0] : today;
      sitemap += `  <!-- Ürün: ${product.title} -->
  <url>
    <loc>${BASE_URL}/urun/${product.id}</loc>
    <lastmod>${productDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
${product.imageUrl ? `    <image:image>
      <image:loc>${product.imageUrl}</image:loc>
      <image:title>${product.title}</image:title>
    </image:image>
` : ''}  </url>

`;
    }

    sitemap += `</urlset>`;

    return new NextResponse(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600'
      }
    });
  } catch (error) {
    console.error('Sitemap generation error:', error);
    
    // Return basic sitemap on error
    const basicSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`;

    return new NextResponse(basicSitemap, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' }
    });
  }
}
