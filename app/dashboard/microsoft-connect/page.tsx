"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/client';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MicrosoftConnectionStatus } from '@/components/microsoft/microsoft-connection-status';

// Supabase client will be initialized in the component

export default function MicrosoftConnectPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<Date | null>(null);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  
  // Check connection status
  useEffect(() => {
    async function checkMicrosoftConnection() {
      try {
        setCheckingConnection(true);
        console.log('Checking Microsoft connection status...');
        
        // Initialize Supabase client inside the component
        const supabase = createClient();
        
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('No authenticated user found');
          setCheckingConnection(false);
          return;
        }
        
        console.log('Checking for Microsoft Graph tokens for user:', user.id);
        
        // Check if user has Microsoft Graph tokens
        const { data, error } = await supabase
          .from('ms_graph_tokens')
          .select('*')
          .eq('profile_id', user.id)
          .single();
        
        if (error) {
          console.log('No Microsoft Graph tokens found:', error.message);
          setIsConnected(false);
        } else if (data) {
          console.log('Microsoft Graph tokens found:', data);
          setIsConnected(true);
          
          // Store token expiration date
          const expiresAt = new Date(data.expires_at);
          setTokenExpiresAt(expiresAt);
          
          const now = new Date();
          
          if (expiresAt <= now) {
            console.log('Token is expired, expires at:', expiresAt.toISOString());
            setError('Microsoft token is expired. Please reconnect your account.');
          }
          
          // Check for placeholder refresh token
          if (data.refresh_token === 'pending_refresh_token') {
            setError('Microsoft authentication incomplete. Please reconnect your account.');
          }
          
          // Get user's Microsoft email address
          try {
            const response = await fetch('https://graph.microsoft.com/v1.0/me', {
              headers: {
                'Authorization': `Bearer ${data.access_token}`
              }
            });
            
            if (response.ok) {
              const userData = await response.json();
              setConnectedEmail(userData.mail || userData.userPrincipalName);
            }
          } catch (error) {
            console.error('Error fetching Microsoft user data:', error);
          }
        } else {
          console.log('No Microsoft Graph tokens found');
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Error checking Microsoft connection:', error);
      } finally {
        setCheckingConnection(false);
      }
    }
    
    checkMicrosoftConnection();
    
    // This will run when the component mounts and when URL parameters change
    // (like after a successful Microsoft authentication redirect)
  }, [searchParams]);
  
  // Connect to Microsoft
  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call API to initiate Microsoft OAuth
      const response = await fetch('/api/auth/microsoft');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to connect to Microsoft');
      }
      
      const data = await response.json();
      
      if (!data.authUrl) {
        throw new Error('Invalid response from server');
      }
      
      console.log('Redirecting to:', data.authUrl);
      
      // Redirect to Microsoft login
      window.location.href = data.authUrl;
    } catch (error: any) {
      console.error('Error connecting to Microsoft:', error);
      setError(error.message || 'Failed to connect to Microsoft');
      setLoading(false);
    }
  };
  
  // Disconnect from Microsoft
  const handleDisconnect = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Initialize Supabase client inside the component
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Delete Microsoft Graph tokens
      const { error } = await supabase
        .from('ms_graph_tokens')
        .delete()
        .eq('profile_id', user.id);
      
      if (error) {
        throw error;
      }
      
      setIsConnected(false);
      setConnectedEmail(null);
      setTokenExpiresAt(null);
    } catch (error: any) {
      setError(error.message || 'Failed to disconnect from Microsoft');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <MicrosoftConnectionStatus />
      
      <h1 className="text-2xl font-bold mb-6">Microsoft Teams Integration</h1>
      
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Microsoft Account</CardTitle>
          <CardDescription>
            Connect your Microsoft account to enable Teams meetings for your sessions.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {checkingConnection ? (
            <p>Checking connection status...</p>
          ) : isConnected ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <AlertTitle>Connected</AlertTitle>
                </div>
                <AlertDescription>
                  Your Microsoft account is connected. You can now create Teams meetings for your sessions.
                </AlertDescription>
              </Alert>
              
              {connectedEmail && (
                <div className="text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-gray-500" />
                    <p className="font-medium">Connected Account:</p>
                  </div>
                  <p className="text-gray-600 ml-6">{connectedEmail}</p>
                </div>
              )}
              
              {tokenExpiresAt && (
                <div className="text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <p className="font-medium">Token Expires:</p>
                  </div>
                  <p className="text-gray-600 ml-6">{new Date(tokenExpiresAt).toLocaleString()}</p>
                  {tokenExpiresAt <= new Date() ? (
                    <div className="flex items-center gap-1 ml-6 mt-1">
                      <AlertCircle className="h-3 w-3 text-red-500" />
                      <p className="text-red-500 text-xs">Token has expired. Please reconnect your account.</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 ml-6 mt-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <p className="text-green-500 text-xs">Token is valid.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Alert className="bg-yellow-50 border-yellow-200">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-yellow-500" />
                <AlertTitle>Not Connected</AlertTitle>
              </div>
              <AlertDescription>
                Connect your Microsoft account to enable Teams meetings for your sessions.
              </AlertDescription>
            </Alert>
          )}
          
          {error && (
            <Alert className="bg-red-50 border-red-200 mt-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <AlertTitle>Error</AlertTitle>
              </div>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 sm:justify-between">
          {isConnected ? (
            <>
              <Button 
                variant="destructive" 
                onClick={handleDisconnect} 
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? 'Disconnecting...' : 'Disconnect Microsoft Account'}
              </Button>
              
              <Button
                variant="default"
                onClick={() => window.location.href = '/dashboard/sessions/create'}
                disabled={loading || (tokenExpiresAt !== null && tokenExpiresAt <= new Date())}
                className="w-full sm:w-auto"
              >
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" /><path d="M7 10L12 15L17 10" /><path d="M12 15V3" /></svg>
                  Create CME Session
                </div>
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleConnect} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Connecting...' : 'Connect Microsoft Account'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
