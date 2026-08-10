import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema/index.js'

const DATABASE_POOL_SIZE = 4

export function createDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl, {
    max: DATABASE_POOL_SIZE,
    prepare: false,
  })

  return {
    client,
    database: drizzle(client, { schema }),
  }
}

export async function warmDatabaseConnection(
  connection: DatabaseConnection,
): Promise<void> {
  await connection.client`select 1`
}

export type DatabaseConnection = ReturnType<typeof createDatabase>

export async function checkDatabaseConnection(
  connection: DatabaseConnection,
): Promise<void> {
  await connection.client`select 1`
}

export async function closeDatabaseConnection(
  connection: DatabaseConnection,
): Promise<void> {
  await connection.client.end({ timeout: 5 })
}
