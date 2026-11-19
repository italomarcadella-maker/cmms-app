import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  AI_PROVIDER: z.enum(["gemini", "ollama"]).default("gemini"),
  GEMINI_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().url().optional(),
  OLLAMA_MODEL: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

const processEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  AI_PROVIDER: process.env.AI_PROVIDER,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
  OLLAMA_MODEL: process.env.OLLAMA_MODEL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

const isServer = typeof window === "undefined";

let env = {};

if (isServer) {
  const parsed = serverSchema.safeParse(processEnv);

  if (!parsed.success) {
    console.error(
      "❌ Invalid environment variables:",
      JSON.stringify(parsed.error.format(), null, 2)
    );
    throw new Error("Invalid environment variables");
  }

  env = parsed.data;

  // Variabili non obbligatorie ma che in produzione conviene avere: si avvisa, non si blocca l'avvio
  if (process.env.NODE_ENV === "production") {
    if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length < 32) {
      console.warn("[env] AUTH_SECRET è corto: usa almeno 32 caratteri casuali (openssl rand -base64 32).");
    }
    if (!process.env.DIRECT_URL) {
      console.warn("[env] DIRECT_URL non impostata: le migrazioni del database useranno DATABASE_URL (con Supabase serve la connessione diretta, porta 5432).");
    }
    if (!process.env.CRON_SECRET) {
      console.warn("[env] CRON_SECRET non impostata: /api/cron/preventive rifiuterà ogni chiamata.");
    }
    if (process.env.ALLOW_DB_RESET === "1") {
      console.warn("[env] ALLOW_DB_RESET=1 in produzione: il reset del database è abilitato. Rimuovila.");
    }
  }
}

export { env };
