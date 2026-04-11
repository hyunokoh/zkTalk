import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import { getDatabaseUrl } from '../env.js';

const connectionString = getDatabaseUrl();

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
export type Database = typeof db;
