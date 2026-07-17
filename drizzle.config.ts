import "dotenv/config";
import { defineConfig } from "drizzle-kit";

declare const process: {
  env: {
    DATABASE_URL?: string;
  };
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env file");
}

if (process.env.DATABASE_URL.includes("[") || process.env.DATABASE_URL.includes("]")) {
  throw new Error("DATABASE_URL still contains placeholder values");
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
