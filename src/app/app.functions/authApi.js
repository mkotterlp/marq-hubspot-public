const axios = require('axios');
const NodeCache = require('node-cache');

// Token cache to store access tokens temporarily
const accessTokenCache = new NodeCache({ deleteOnExpire: true });
const refreshTokenStore = {};

// Import environment variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Function to handle refreshing tokens if expired
const refreshAccessToken = async (userId) => {
  const refreshTokenProof = {
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    refresh_token: refreshTokenStore[userId],
  };
  return await exchangeForTokens(userId, refreshTokenProof);
};

// Helper function to get or refresh the access token
const getAccessToken = async (userId) => {
    // Handle the case where userId is null or undefined
    if (!userId) {
      throw new Error("User ID is required to get an access token.");
    }
  
    // Check if access token exists in cache for this user
    if (!accessTokenCache.get(userId)) {
      console.log('Refreshing expired or missing access token');
      // Refresh the access token if it's missing or expired
      await refreshAccessToken(userId);
    }
  
    // Return the cached access token after refreshing if needed
    return accessTokenCache.get(userId);
  };
  

// Exchange authorization code for access and refresh tokens
const exchangeForTokens = async (userId, exchangeProof) => {
  try {
    const response = await axios.post('https://api.hubapi.com/oauth/v1/token', new URLSearchParams(exchangeProof), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const tokens = response.data;

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000); // expires_in is in seconds
    refreshTokenStore[userId] = tokens.refresh_token;
    accessTokenCache.set(userId, tokens.access_token, Math.round(tokens.expires_in * 0.75));

    return tokens.access_token;
  } catch (error) {
    console.error(`Error exchanging ${exchangeProof.grant_type} for access token:`, error.message);
    throw new Error(error.message);
  }
};

// Function to make HubSpot API calls with the access token globally
const makeApiCall = async (userId = null, method, url, body = null) => {
  const accessToken = await getAccessToken(userId);
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const options = {
    method,
    url,
    headers,
    data: body || undefined,  // `axios` uses `data` for request body
  };

  try {
    const response = await axios(options);
    return response.data;
  } catch (error) {
    console.error('Error during API call:', error.message);
    throw error;
  }
};

module.exports = {
  makeApiCall,
  exchangeForTokens,
};
