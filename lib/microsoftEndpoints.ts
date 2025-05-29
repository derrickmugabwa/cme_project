// Microsoft OAuth and Graph API endpoints configuration

const COMMON_ENDPOINT = 'common'; // Can be used for both personal and work accounts
const accountType = COMMON_ENDPOINT;

const microsoftEndpoints = {
  // Authorization endpoint
  authorizationEndpoint: `https://login.microsoftonline.com/${accountType}/oauth2/v2.0/authorize`,
  
  // Token endpoint for getting and refreshing tokens
  tokenEndpoint: `https://login.microsoftonline.com/${accountType}/oauth2/v2.0/token`,
  
  // Graph API endpoint
  graphApiEndpoint: 'https://graph.microsoft.com/v1.0'
};

export default microsoftEndpoints;
