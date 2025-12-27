import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { decrypt } from '@/lib/crypto';

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'pubg_uc_store';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

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

export async function GET(request) {
  try {
    const database = await connectDB();
    const { searchParams } = new URL(request.url);
    
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle Google OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(`${BASE_URL}?error=google_auth_denied`);
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(`${BASE_URL}?error=invalid_callback`);
    }

    // Validate state (CSRF protection)
    const storedState = await database.collection('oauth_states').findOne({ 
      state, 
      provider: 'google',
      expiresAt: { $gt: new Date() }
    });

    if (!storedState) {
      return NextResponse.redirect(`${BASE_URL}?error=invalid_state`);
    }

    // Delete used state
    await database.collection('oauth_states').deleteOne({ state });

    // Get OAuth settings
    const oauthSettings = await database.collection('oauth_settings').findOne({ provider: 'google' });
    
    if (!oauthSettings || !oauthSettings.enabled) {
      return NextResponse.redirect(`${BASE_URL}?error=oauth_disabled`);
    }

    // Decrypt credentials
    let clientId, clientSecret;
    try {
      clientId = decrypt(oauthSettings.clientId);
      clientSecret = decrypt(oauthSettings.clientSecret);
    } catch (error) {
      console.error('Failed to decrypt OAuth credentials:', error);
      return NextResponse.redirect(`${BASE_URL}?error=oauth_config_error`);
    }

    // Get site base URL
    const siteSettings = await database.collection('site_settings').findOne({ active: true });
    const baseUrl = siteSettings?.baseUrl || BASE_URL;
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Token exchange error:', tokenData);
      return NextResponse.redirect(`${BASE_URL}?error=token_exchange_failed`);
    }

    const { access_token, id_token } = tokenData;

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const googleUser = await userInfoResponse.json();

    if (!userInfoResponse.ok || !googleUser.email) {
      console.error('Failed to get user info:', googleUser);
      return NextResponse.redirect(`${BASE_URL}?error=user_info_failed`);
    }

    // Extract Google user data
    const { id: googleId, email, name, picture, given_name, family_name } = googleUser;

    // Check if user exists by Google ID
    let user = await database.collection('users').findOne({ googleId });

    if (!user) {
      // Check if user exists by email
      user = await database.collection('users').findOne({ email: email.toLowerCase() });

      if (user) {
        // Link Google account to existing user
        await database.collection('users').updateOne(
          { id: user.id },
          { 
            $set: { 
              googleId,
              avatarUrl: picture || user.avatarUrl,
              updatedAt: new Date()
            }
          }
        );
        user.googleId = googleId;
        user.avatarUrl = picture || user.avatarUrl;
      } else {
        // Create new user
        user = {
          id: uuidv4(),
          email: email.toLowerCase(),
          firstName: given_name || name?.split(' ')[0] || 'Google',
          lastName: family_name || name?.split(' ').slice(1).join(' ') || 'User',
          phone: '', // Will need to be filled later if required
          googleId,
          avatarUrl: picture || null,
          authProvider: 'google',
          emailVerified: true, // Google emails are verified
          passwordHash: null, // No password for Google-only users
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await database.collection('users').insertOne(user);
      }
    } else {
      // Update avatar if changed
      if (picture && picture !== user.avatarUrl) {
        await database.collection('users').updateOne(
          { id: user.id },
          { $set: { avatarUrl: picture, updatedAt: new Date() } }
        );
        user.avatarUrl = picture;
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        type: 'user'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create response with token cookie and redirect
    const response = NextResponse.redirect(`${BASE_URL}?google_auth=success`);
    
    // Set token in cookie (httpOnly for security)
    response.cookies.set('googleAuthToken', token, {
      httpOnly: false, // Allow JS access for localStorage migration
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    // Also pass user data in cookie for frontend
    const userData = JSON.stringify({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      avatarUrl: user.avatarUrl || null,
      authProvider: user.authProvider || (user.googleId ? 'google' : 'local')
    });

    response.cookies.set('googleAuthUser', encodeURIComponent(userData), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60, // Short lived, just for transfer
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(`${BASE_URL}?error=oauth_callback_error`);
  }
}
