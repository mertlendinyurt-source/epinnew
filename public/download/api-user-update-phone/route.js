import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function POST(request) {
  try {
    // Get token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Yetkisiz erişim' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz token' },
        { status: 401 }
      );
    }
    
    // Get phone from body
    const body = await request.json();
    const { phone } = body;
    
    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Geçerli bir telefon numarası girin' },
        { status: 400 }
      );
    }
    
    // Connect to MongoDB
    const client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    const db = client.db(process.env.DB_NAME || 'pinly_store');
    
    // Update user phone
    await db.collection('users').updateOne(
      { id: decoded.id },
      { 
        $set: { 
          phone: phone.trim(),
          updatedAt: new Date()
        }
      }
    );
    
    await client.close();
    
    return NextResponse.json({
      success: true,
      message: 'Telefon numarası güncellendi'
    });
    
  } catch (error) {
    console.error('Update phone error:', error);
    return NextResponse.json(
      { success: false, error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}
