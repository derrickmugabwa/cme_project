import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import microsoftEndpoints from '@/lib/microsoftEndpoints';

// Microsoft OAuth configuration
const clientId = process.env.MICROSOFT_CLIENT_ID || '';
const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || '';
const redirectUri = process.env.MICROSOFT_REDIRECT_URI || '';

export async function GET(request: NextRequest) {
  try {
    // Get URL parameters
    const searchParams = new URL(request.url).searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // User ID
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    // Handle errors from Microsoft
    if (error) {
      console.error('Microsoft OAuth error:', error, errorDescription);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/microsoft-connect?error=microsoft_auth_failed`);
    }
    
    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/microsoft-connect?error=invalid_callback`);
    }
    
    // Initialize Supabase client with the server implementation
    const supabase = await createClient();
    
    // Exchange code for tokens
    const tokenResponse = await fetch(microsoftEndpoints.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/microsoft-connect?error=token_exchange_failed`);
    }
    
    const tokenData = await tokenResponse.json();
    
    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);
    
    // Store tokens in database
    const { error: upsertError } = await supabase.from('ms_graph_tokens').upsert({
      profile_id: state,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    if (upsertError) {
      console.error('Error storing tokens:', upsertError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/microsoft-connect?error=token_storage_failed`);
    }
    
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/microsoft-connect?microsoft_connected=true`);
  } catch (error: any) {
    console.error('Error in Microsoft callback:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/microsoft-connect?error=unexpected_error`);
  }
}
