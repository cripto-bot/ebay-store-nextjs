// lib/ebayConfig.js
export const EBAY_PROD_CLIENT_ID = process.env.EBAY_PROD_CLIENT_ID;
export const EBAY_PROD_CLIENT_SECRET = process.env.EBAY_PROD_CLIENT_SECRET;
export const EBAY_PROD_TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token";
export const EBAY_PROD_BROWSE_API_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";
export const REQUESTED_PROD_SCOPES = ["https://api.ebay.com/oauth/api_scope"];
export const SCOPES_PROD_STRING = REQUESTED_PROD_SCOPES.join(" ");
