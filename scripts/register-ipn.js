// Plain JavaScript version of the IPN registration script
require('dotenv').config({ path: '.env.local' });
const https = require('https');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({ statusCode: res.statusCode, data: parsedData });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

async function registerPesaPalIPN() {
  try {
    // Check if required environment variables are set
    if (!process.env.PESAPAL_CONSUMER_KEY || !process.env.PESAPAL_CONSUMER_SECRET) {
      console.error('Error: PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET must be set in .env.local');
      process.exit(1);
    }

    // Determine base URL and hostname based on environment
    const isProduction = process.env.PESAPAL_ENVIRONMENT === 'production';
    const hostname = isProduction ? 'pay.pesapal.com' : 'cybqa.pesapal.com';
    const path = isProduction ? '/v3/api/Auth/RequestToken' : '/pesapalv3/api/Auth/RequestToken';

    // Step 1: Get authentication token
    console.log('Getting PesaPal authentication token...');
    
    const tokenData = JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    });
    
    const tokenOptions = {
      hostname: hostname,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': tokenData.length
      }
    };
    
    const tokenResponse = await makeRequest(tokenOptions, tokenData);
    
    if (tokenResponse.statusCode !== 200) {
      throw new Error(`Failed to get token: HTTP ${tokenResponse.statusCode}`);
    }
    
    const token = tokenResponse.data.token;
    console.log('✅ Authentication token obtained');

    // Step 2: Register IPN URL
    const ipnUrl = 'https://061a-102-219-210-201.ngrok-free.app/api/payments/pesapal/ipn';
    console.log(`Registering IPN URL: ${ipnUrl}`);
    
    const ipnData = JSON.stringify({
      url: ipnUrl,
      ipn_notification_type: 'GET'
    });
    
    const ipnPath = isProduction ? '/v3/api/URLSetup/RegisterIPN' : '/pesapalv3/api/URLSetup/RegisterIPN';
    
    const ipnOptions = {
      hostname: hostname,
      path: ipnPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': ipnData.length,
        'Authorization': `Bearer ${token}`
      }
    };
    
    const ipnResponse = await makeRequest(ipnOptions, ipnData);
    
    if (ipnResponse.statusCode !== 200) {
      throw new Error(`Failed to register IPN: HTTP ${ipnResponse.statusCode}`);
    }
    
    const ipnId = ipnResponse.data.ipn_id;

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

// Install required dependencies if not already installed
const { execSync } = require('child_process');
try {
  console.log('Checking for required dependencies...');
  try {
    require.resolve('dotenv');
    require.resolve('node-fetch');
  } catch (e) {
    console.log('Installing required dependencies...');
    execSync('npm install dotenv node-fetch', { stdio: 'inherit' });
  }
  
  // Run the registration function
  registerPesaPalIPN();
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
