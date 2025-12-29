import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Static file server for uploads - solves Next.js standalone mode issue
export async function GET(request, { params }) {
  try {
    const pathSegments = params.path;
    
    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    // Sanitize path to prevent directory traversal
    const sanitizedPath = pathSegments.map(segment => 
      segment.replace(/\.\./g, '').replace(/[^a-zA-Z0-9._-]/g, '')
    ).join('/');
    
    // Build full file path
    const filePath = path.join(process.cwd(), 'public', 'uploads', sanitizedPath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('File not found:', filePath);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    // Check if it's a file (not directory)
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 404 });
    }
    
    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    
    // Determine content type based on extension
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.bmp': 'image/bmp',
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    // Return file with proper headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
    
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
