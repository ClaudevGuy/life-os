import type { Config } from "drizzle-kit";
import { config } from "dotenv";

// drizzle-kit does NOT auto-load .env.local — load it explicitly.
config({ path: ".env.local" });

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
} satisfies Config;
