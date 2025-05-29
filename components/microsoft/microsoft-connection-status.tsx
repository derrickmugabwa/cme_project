"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

// You'll need to create a notification context/hook
interface NotificationContextType {
  showNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

// This is a placeholder - you'll need to implement this hook based on your notification system
const useNotification = (): NotificationContextType => {
  return {
    showNotification: (type, message) => {
      // Implement based on your notification system
      console.log(`${type}: ${message}`);
      // Example: toast(message, { type });
    }
  };
};

export function MicrosoftConnectionStatus() {
  const searchParams = useSearchParams();
  const { showNotification } = useNotification();
  
  useEffect(() => {
    // Check for Microsoft connection status in URL
    const microsoftConnected = searchParams.get('microsoft_connected');
    const error = searchParams.get('error');
    
    // Handle success
    if (microsoftConnected === 'true') {
      showNotification(
        'success', 
        'Microsoft account connected successfully! You can now create Teams meetings.'
      );
    }
    
    // Handle various error types
    if (error) {
      let errorMessage = 'Failed to connect Microsoft account. Please try again.';
      
      switch (error) {
        case 'microsoft_auth_failed':
          errorMessage = 'Microsoft authentication failed. Please try again.';
          break;
        case 'token_exchange_failed':
          errorMessage = 'Failed to get Microsoft access tokens. Please try again.';
          break;
        case 'token_storage_failed':
          errorMessage = 'Failed to store Microsoft tokens. Please try again.';
          break;
        case 'invalid_callback':
          errorMessage = 'Invalid authentication callback. Please try again.';
          break;
        case 'unexpected_error':
          errorMessage = 'An unexpected error occurred. Please try again later.';
          break;
      }
      
      showNotification('error', errorMessage);
    }
    
    // Remove query parameters from URL
    if (microsoftConnected || error) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, showNotification]);
  
  return null;
}
