import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import microsoftEndpoints from '@/lib/microsoftEndpoints';

// Microsoft OAuth configuration
const clientId = process.env.MICROSOFT_CLIENT_ID || '';
const redirectUri = process.env.MICROSOFT_REDIRECT_URI || '';

export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase client with the server implementation
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('User not authenticated');
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }
    
    // Build Microsoft OAuth URL with required scopes
    const scopes = [
      'offline_access', // Required for refresh tokens
      'openid',
      'User.Read',
      'OnlineMeetings.ReadWrite',
      'Calendars.ReadWrite'
    ];
    
    try {
      // Make sure all required configuration is present
      if (!clientId) {
        throw new Error('Microsoft client ID is not configured');
      }
      
      if (!redirectUri) {
        throw new Error('Microsoft redirect URI is not configured');
      }
      
      const authUrl = `${microsoftEndpoints.authorizationEndpoint}?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scopes.join(' '))}` +
        `&response_mode=query` +
        `&prompt=consent` +
        `&state=${encodeURIComponent(user.id)}`;
      
      console.log('Generated Microsoft auth URL:', authUrl);
      
      return NextResponse.json({ authUrl });
    } catch (error: any) {
      console.error('Error generating Microsoft auth URL:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error initiating Microsoft authentication:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
