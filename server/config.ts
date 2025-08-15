export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  environment: process.env.NODE_ENV || 'development'
};

// API endpoint to provide environment variables to frontend
export const getClientConfig = () => ({
  environment: config.environment
});