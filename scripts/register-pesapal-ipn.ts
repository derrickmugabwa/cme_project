import { createPesaPalClient } from '../lib/payment-providers/pesapal';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function registerPesaPalIPN() {
  try {
    // Check if required environment variables are set
    if (!process.env.PESAPAL_CONSUMER_KEY || !process.env.PESAPAL_CONSUMER_SECRET) {
      console.error('Error: PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET must be set in .env.local');
      process.exit(1);
    }

    // Create PesaPal client
    const pesapalClient = createPesaPalClient();
    
    // Your ngrok URL + the path to your IPN handler
    const ipnUrl = 'https://061a-102-219-210-201.ngrok-free.app/api/payments/pesapal/ipn';
    
    console.log(`Registering IPN URL: ${ipnUrl}`);
    
    // Register the IPN URL
    const ipnId = await pesapalClient.registerIPN(ipnUrl);
    
    console.log('✅ IPN registration successful!');
    console.log('Your IPN ID:', ipnId);
    console.log('\nAdd this to your .env.local file:');
    console.log(`PESAPAL_IPN_ID=${ipnId}`);
    
    // Also set the callback URL
    console.log('\nAlso add this to your .env.local file:');
    console.log('PESAPAL_CALLBACK_URL=https://061a-102-219-210-201.ngrok-free.app/dashboard/units/payment-complete');
    
  } catch (error) {
    console.error('Error registering PesaPal IPN:', error);
    process.exit(1);
  }
}

// Run the registration function
registerPesaPalIPN();
