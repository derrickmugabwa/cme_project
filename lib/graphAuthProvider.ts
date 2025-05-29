import { createClient } from '@supabase/supabase-js';
import microsoftEndpoints from './microsoftEndpoints';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

class GraphAuthProvider {
  supabase: any;

  constructor() {
    this.supabase = supabase;
  }

  // Get access token directly
  async getAccessTokenDirectly(userId: string) {
    try {
      // Get the user's Microsoft Graph tokens from the database
      const { data, error } = await this.supabase
        .from('ms_graph_tokens')
        .select('*')
        .eq('profile_id', userId)
        .maybeSingle();

      if (!data) {
        throw new Error('Microsoft account not connected. Please connect your Microsoft account to enable Teams integration.');
      }
      
      // Check if refresh token is a placeholder
      if (data.refresh_token === 'pending_refresh_token') {
        throw new Error('Microsoft authentication incomplete. Please reconnect your Microsoft account.');
      }

      // Check if token is expired and needs refresh
      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      
      // Add buffer time (5 minutes) to avoid edge cases
      const bufferMs = 5 * 60 * 1000; // 5 minutes in milliseconds
      const isExpiredWithBuffer = expiresAt.getTime() - now.getTime() < bufferMs;
      
      if (isExpiredWithBuffer) {
        // Token is expired, refresh it
        const newToken = await this.refreshToken(data.refresh_token, userId);
        return newToken.access_token;
      }

      return data.access_token;
    } catch (error: any) {
      console.error('Error getting access token directly:', error);
      throw new Error(`Failed to get access token for Microsoft Graph API: ${error.message}`);
    }
  }
  
  // Refresh token implementation
  async refreshToken(refreshToken: string, userId: string) {
    try {
      const response = await fetch(microsoftEndpoints.tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID || '',
          client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Token refresh failed: ${errorData.error_description || 'Unknown error'}`);
      }

      const tokenData = await response.json();

      // Calculate token expiration
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

      // Update tokens in database
      const { error } = await this.supabase
        .from('ms_graph_tokens')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || refreshToken, // Some providers don't return a new refresh token
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('profile_id', userId);

      if (error) {
        throw new Error(`Failed to update tokens in database: ${error.message}`);
      }

      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refreshToken,
        expires_at: expiresAt,
      };
    } catch (error: any) {
      console.error('Error refreshing token:', error);
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }

  // Get auth provider for Microsoft Graph client
  getAuthProvider(userId: string) {
    return {
      getAccessToken: async () => {
        try {
          const token = await this.getAccessTokenDirectly(userId);
          return token;
        } catch (error) {
          console.error('Error in getAccessToken:', error);
          throw error;
        }
      },
    };
  }
}

// Create a singleton instance
const graphAuthProvider = new GraphAuthProvider();

export default graphAuthProvider;
