import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const { Pool } = pg;

function loadLocalEnv() {
  const envFiles = [".env.local", ".env"];

  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (!existsSync(fullPath)) continue;

    const content = readFileSync(fullPath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;

      const [, key, valuePart] = match;
      if (process.env[key] !== undefined) continue;

      let value = valuePart;
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  }
}

function warnIfSupabaseDirectHost(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl);
    const host = url.hostname.toLowerCase();
    const isSupabaseDirectHost =
      host.startsWith("db.") && host.endsWith(".supabase.co");
    const usesPooler = host.includes(".pooler.supabase.com");

    if (isSupabaseDirectHost && !usesPooler) {
      console.warn(
        "[db] DATABASE_URL appears to use Supabase direct DB host (IPv6-only in many regions). For Render/free IPv4 networks, prefer the Supabase pooler URL on port 6543.",
      );
    }
  } catch {
    // Ignore parse failures and rely on pg connection errors for invalid URLs.
  }
}

loadLocalEnv();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Add it in your shell environment or create a .env/.env.local file.",
  );
}

warnIfSupabaseDirectHost(process.env.DATABASE_URL);

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
