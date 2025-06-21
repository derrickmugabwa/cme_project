import { v4 as uuidv4 } from 'uuid';

interface PesaPalConfig {
  consumerKey: string;
  consumerSecret: string;
  environment: 'sandbox' | 'production';
  callbackUrl: string;
  ipnId: string;
}

interface PesaPalOrderRequest {
  id: string;
  currency: string;
  amount: number;
  description: string;
  callback_url: string;
  notification_id: string;
  billing_address: {
    email_address: string;
    phone_number?: string;
    country_code?: string;
    first_name?: string;
    last_name?: string;
  };
}

export class PesaPalClient {
  private baseUrl: string;
  private config: PesaPalConfig;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: PesaPalConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production'
      ? 'https://pay.pesapal.com/v3'
      : 'https://cybqa.pesapal.com/pesapalv3';
  }

  // Get authentication token
  async getToken(): Promise<string> {
    // Return existing token if still valid
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/Auth/RequestToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consumer_key: this.config.consumerKey,
          consumer_secret: this.config.consumerSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get PesaPal token: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Set token and expiry (token typically valid for 1 hour)
      this.token = data.token;
      // Set expiry 5 minutes before actual expiry to be safe
      this.tokenExpiry = new Date(Date.now() + (55 * 60 * 1000));
      
      // Ensure we don't return null
      if (!this.token) {
        throw new Error('Failed to obtain PesaPal token');
      }
      
      return this.token;
    } catch (error) {
      console.error('Error getting PesaPal token:', error);
      throw error;
    }
  }

  // Register IPN URL (typically done once during setup)
  async registerIPN(ipnUrl: string): Promise<string> {
    const token = await this.getToken();
    
    try {
      const response = await fetch(`${this.baseUrl}/api/URLSetup/RegisterIPN`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: ipnUrl,
          ipn_notification_type: 'GET',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to register IPN: ${response.statusText}`);
      }

      const data = await response.json();
      return data.ipn_id;
    } catch (error) {
      console.error('Error registering PesaPal IPN:', error);
      throw error;
    }
  }

  // Submit order to PesaPal
  async submitOrder(orderData: {
    amount: number;
    currency: string;
    description: string;
    email: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
    reference?: string;
  }): Promise<{ redirect_url: string; order_tracking_id: string }> {
    const token = await this.getToken();
    const orderReference = orderData.reference || uuidv4();
    
    try {
      const orderRequest: PesaPalOrderRequest = {
        id: orderReference,
        currency: orderData.currency,
        amount: orderData.amount,
        description: orderData.description,
        callback_url: this.config.callbackUrl,
        notification_id: this.config.ipnId,
        billing_address: {
          email_address: orderData.email,
          phone_number: orderData.phoneNumber,
          first_name: orderData.firstName,
          last_name: orderData.lastName,
        },
      };

      const response = await fetch(`${this.baseUrl}/api/Transactions/SubmitOrderRequest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(orderRequest),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit order: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        redirect_url: data.redirect_url,
        order_tracking_id: data.order_tracking_id,
      };
    } catch (error) {
      console.error('Error submitting PesaPal order:', error);
      throw error;
    }
  }

  // Get transaction status
  async getTransactionStatus(orderTrackingId: string): Promise<{
    status: string;
    payment_method: string;
    payment_account?: string;
    reference?: string;
    payment_status_description?: string;
  }> {
    const token = await this.getToken();
    
    try {
      const response = await fetch(`${this.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get transaction status: ${response.statusText}`);
      }

      // Log the raw response for debugging
      const rawResponse = await response.text();
      console.log('Raw PesaPal response:', rawResponse);
      
      // Parse the response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(rawResponse);
      } catch (parseError) {
        console.error('Error parsing PesaPal response:', parseError);
        throw new Error('Invalid JSON response from PesaPal');
      }
      
      console.log('Parsed PesaPal response:', parsedResponse);
      
      // Handle different response formats
      // Some responses have status directly, others have payment_status_description
      return {
        status: parsedResponse.status || '',
        payment_method: parsedResponse.payment_method || '',
        payment_account: parsedResponse.payment_account || undefined,
        reference: parsedResponse.reference || undefined,
        payment_status_description: parsedResponse.payment_status_description || undefined
      };
    } catch (error) {
      console.error('Error getting PesaPal transaction status:', error);
      throw error;
    }
  }
}

// Export a factory function to create PesaPal client
export function createPesaPalClient(): PesaPalClient {
  return new PesaPalClient({
    consumerKey: process.env.PESAPAL_CONSUMER_KEY!,
    consumerSecret: process.env.PESAPAL_CONSUMER_SECRET!,
    environment: (process.env.PESAPAL_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
    callbackUrl: process.env.PESAPAL_CALLBACK_URL!,
    ipnId: process.env.PESAPAL_IPN_ID!,
  });
}
