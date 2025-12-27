import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'pubg_uc_store';

let client = null;
let db = null;

async function connectDB() {
  if (!client) {
    client = new MongoClient(MONGO_URL);
    await client.connect();
    db = client.db(DB_NAME);
  }
  return db;
}

export async function GET() {
  try {
    const database = await connectDB();
    const oauthSettings = await database.collection('oauth_settings').findOne({ provider: 'google' });
    
    return NextResponse.json({
      success: true,
      data: {
        enabled: oauthSettings?.enabled === true && !!oauthSettings?.clientId
      }
    });
  } catch (error) {
    console.error('Error checking OAuth status:', error);
    return NextResponse.json({
      success: true,
      data: { enabled: false }
    });
  }
}
