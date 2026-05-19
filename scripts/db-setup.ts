/**
 * One-time DB setup: enable pgvector extension on the Neon database.
 * Run with: npm run db:setup
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in .env.local");
  }
  const sql = neon(process.env.DATABASE_URL);
  console.log("Enabling pgvector extension...");
  await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
  console.log("Done. Now run: npm run db:push");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
