import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// `neon()` does not connect eagerly — it returns a tagged-template function
// that connects on first query. So we can construct the client at module load
// without crashing `next build` when DATABASE_URL is not yet set. If a query
// is attempted with the placeholder URL, neon will throw at request time
// with a clear error.
const url = process.env.DATABASE_URL
  ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder";

const sql = neon(url);
export const db = drizzle(sql, { schema });
export { schema };
