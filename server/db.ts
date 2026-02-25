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

loadLocalEnv();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Add it in your shell environment or create a .env/.env.local file.",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });