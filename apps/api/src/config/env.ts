import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Render/Railway/Fly inject PORT — honor it first, then API_PORT, then 4000.
  PORT: z.coerce.number().optional(),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().default(12),

  // At-rest encryption (32 bytes base64)
  ENCRYPTION_KEY: z.string().min(40),

  // CORS / limits
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().default(300),

  // Meta
  META_APP_ID: z.string().optional().default(''),
  META_APP_SECRET: z.string().optional().default(''),
  META_VERIFY_TOKEN: z.string().optional().default('oneplace-verify-token'),
  META_GRAPH_VERSION: z.string().default('v19.0'),
  META_TEST_EVENT_CODE: z.string().optional().default(''),

  // WhatsApp
  WHATSAPP_VERIFY_TOKEN: z.string().optional().default('oneplace-wa-verify'),

  // AI
  OPENAI_API_KEY: z.string().optional().default(''),
  AI_MODEL: z.string().default('gpt-4o-mini'),
  AI_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid env:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
