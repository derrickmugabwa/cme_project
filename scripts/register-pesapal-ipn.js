// This is a Node.js script to run the TypeScript file using ts-node
const { execSync } = require('child_process');
const path = require('path');

try {
  // Check if ts-node is installed
  try {
    execSync('npx ts-node --version', { stdio: 'ignore' });
  } catch (error) {
    console.log('Installing ts-node and dotenv...');
    execSync('npm install --save-dev ts-node dotenv', { stdio: 'inherit' });
  }

  // Run the TypeScript file
  console.log('Registering PesaPal IPN URL...');
  execSync('npx ts-node ' + path.join(__dirname, 'register-pesapal-ipn.ts'), { stdio: 'inherit' });
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
