import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  DATABASE_URL: Joi.string().uri().required(),
  CORS_ORIGINS: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),
  MIDTRANS_SERVER_KEY: Joi.string().optional(),
  MIDTRANS_IS_PRODUCTION: Joi.boolean().default(false),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3001'),
  SHIPPING_BASE_COST: Joi.number().integer().min(0).default(20000),
  SHIPPING_PER_KG_COST: Joi.number().integer().min(0).default(5000),
});
