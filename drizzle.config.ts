// drizzle.config.ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['./src/infrastructure/drizzle/schema.ts'],
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!, // <-- note the '!' here
  },
  out: './src/infrastructure/drizzle/generated',
});
