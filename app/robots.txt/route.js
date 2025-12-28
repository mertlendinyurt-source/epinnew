import { NextResponse } from 'next/server';

export async function GET() {
  const robotsTxt = `# PINLY Robots.txt
# https://pinly.com.tr

User-agent: *
Allow: /

# Sitemap
Sitemap: https://pinly.com.tr/sitemap.xml

# Disallow admin and API routes
Disallow: /admin/
Disallow: /api/
Disallow: /order/

# Allow search engines to crawl product pages
Allow: /urun/
`;

  return new NextResponse(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
