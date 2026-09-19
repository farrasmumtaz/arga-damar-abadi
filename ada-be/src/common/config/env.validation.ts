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
  SHIPPING_PROVIDER: Joi.string()
    .valid('INTERNAL', 'BITESHIP')
    .default('INTERNAL'),
  SHIPPING_ORIGIN_POSTAL_CODE: Joi.string()
    .pattern(/^\d{5}$/)
    .optional(),
  BITESHIP_API_KEY: Joi.string().optional(),
  BITESHIP_COURIERS: Joi.string()
    .pattern(/^[a-z0-9_,]+$/)
    .default('jne'),
  WHATSAPP_ENABLED: Joi.boolean().default(false),
  WHATSAPP_ACCESS_TOKEN: Joi.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: Joi.string().pattern(/^\d+$/).optional(),
  WHATSAPP_GRAPH_VERSION: Joi.string()
    .pattern(/^v\d+\.\d+$/)
    .optional(),
  WHATSAPP_TEMPLATE_NAME: Joi.string()
    .pattern(/^[a-z0-9_]+$/)
    .optional(),
  WHATSAPP_TEMPLATE_LANGUAGE: Joi.string()
    .pattern(/^[a-z]{2}(_[A-Z]{2})?$/)
    .default('id'),
  SMTP_HOST: Joi.string().optional(),
  SUPABASE_URL: Joi.string()
    .uri({ scheme: ['https', 'http'] })
    .optional(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().optional(),
  STORAGE_IMAGES_BUCKET: Joi.string().default('product-images'),
  STORAGE_BOQ_BUCKET: Joi.string().default('boq-private'),
  CLAMAV_HOST: Joi.string().optional(),
  CLAMAV_PORT: Joi.number().port().default(3310),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASSWORD: Joi.string().optional(),
  MAIL_FROM: Joi.string().optional(),
  MAINTENANCE_ENABLED: Joi.boolean().default(false),
  NOTIFICATIONS_ENABLED: Joi.boolean().default(false),
  ORDER_PAYMENT_TTL_MINUTES: Joi.number()
    .integer()
    .min(5)
    .max(10080)
    .default(60),
});
