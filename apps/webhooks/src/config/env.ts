import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  ABACATEPAY_API_KEY: z.string().min(20),
  ABACATEPAY_WEBHOOK_SECRET: z.string().min(10),
});

export const env = envSchema.parse(process.env);
