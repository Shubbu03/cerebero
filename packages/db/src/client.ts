import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema/index.js'

export function createDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl, {
    max: 10,
    prepare: false,
  })

  return {
    client,
    database: drizzle(client, { schema }),
  }
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
