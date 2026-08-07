import 'dotenv/config'

import { defineConfig } from 'drizzle-kit'
import { z } from 'zod'

const databaseUrl = z.url().parse(process.env.DATABASE_URL)

export default defineConfig({
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  migrations: {
    prefix: 'timestamp',
  },
  out: './migrations',
  schema: './src/schema/index.ts',
  strict: true,
  verbose: true,
})
