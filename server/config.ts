export const config = {
  fmpApiKey: process.env.FMP_API_KEY || '',
  port: parseInt(process.env.PORT || '5000', 10),
  environment: process.env.NODE_ENV || 'development'
};

// API endpoint to provide environment variables to frontend
export const getClientConfig = () => ({
  fmpApiKey: config.fmpApiKey,
  environment: config.environment
});