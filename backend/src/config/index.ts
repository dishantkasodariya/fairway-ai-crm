import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || 'fairway_jwt_super_secret_key_default';

if (nodeEnv === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fairway_jwt_super_secret_key_default')) {
  throw new Error('🚨 CRITICAL SECURITY ERROR: Production deployment running with default or missing JWT_SECRET! Set a secure secret in .env immediately.');
}

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  nodeEnv,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fairway_crm?schema=public',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};
