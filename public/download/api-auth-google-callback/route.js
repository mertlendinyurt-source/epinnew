import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  if (error) {
    return NextResponse.redirect(new URL('/?google_auth=error&reason=google_auth_denied', baseUrl));
  }
  
  if (!code) {
    return NextResponse.redirect(new URL('/?google_auth=error&reason=no_code', baseUrl));
  }
  
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/api/auth/google/callback`;
    
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/?google_auth=error&reason=oauth_config_error', baseUrl));
    }
    
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error('Google OAuth token error:', tokenData);
      return NextResponse.redirect(new URL('/?google_auth=error&reason=token_error', baseUrl));
    }
    
    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    
    const googleUser = await userInfoResponse.json();
    
    if (!googleUser.email) {
      return NextResponse.redirect(new URL('/?google_auth=error&reason=no_email', baseUrl));
    }
    
    // Connect to MongoDB
    const client = new MongoClient(process.env.MONGO_URL);
    await client.connect();
    const db = client.db(process.env.DB_NAME || 'pinly_store');
    
    // Check if user exists
    let user = await db.collection('users').findOne({ email: googleUser.email });
    
    if (user) {
      // Update existing user with Google info if not already linked
      if (!user.googleId) {
        await db.collection('users').updateOne(
          { id: user.id },
          { 
            $set: { 
              googleId: googleUser.id,
              authMethod: 'google',
              profilePicture: user.profilePicture || googleUser.picture,
              updatedAt: new Date()
            }
          }
        );
        user.googleId = googleUser.id;
        user.authMethod = 'google';
      }
    } else {
      // Create new user
      const userId = uuidv4();
      const nameParts = (googleUser.name || '').split(' ');
      const firstName = nameParts[0] || googleUser.given_name || 'User';
      const lastName = nameParts.slice(1).join(' ') || googleUser.family_name || '';
      
      user = {
        id: userId,
        email: googleUser.email,
        firstName,
        lastName,
        phone: '',
        googleId: googleUser.id,
        profilePicture: googleUser.picture,
        role: 'user',
        status: 'active',
        authMethod: 'google',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('users').insertOne(user);
    }
    
    await client.close();
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, type: 'user', role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Create response with redirect
    const response = NextResponse.redirect(new URL('/?google_auth=success', baseUrl));
    
    // Set cookies for client-side handling - INCLUDE authMethod and googleId
    response.cookies.set('googleAuthToken', token, {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 5,
      path: '/'
    });
    
    response.cookies.set('googleAuthUser', Buffer.from(JSON.stringify({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      profilePicture: user.profilePicture,
      authMethod: 'google',
      googleId: user.googleId
    })).toString('base64'), {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 5,
      path: '/'
    });
    
    return response;
    
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(new URL('/?google_auth=error&reason=oauth_callback_error', baseUrl));
  }
}
