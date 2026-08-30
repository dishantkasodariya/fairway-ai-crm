import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fairway_crm?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'fairway_jwt_super_secret_key_default',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};
