import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

if (process.env.DATABASE_URL.includes("[") || process.env.DATABASE_URL.includes("]")) {
  throw new Error("DATABASE_URL still contains placeholder values");
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql);
export const pool = undefined as { end: () => Promise<void> } | undefined;
