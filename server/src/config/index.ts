import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  wsPort: parseInt(process.env.WS_PORT || '1234', 10),
  persistenceType: process.env.PERSISTENCE_TYPE || 'memory',
  dbPath: process.env.DB_PATH || './data/yjs-db',
};

export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';