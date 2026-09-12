import { configurationError } from './errors.mjs';

let poolPromise;

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw configurationError('DATABASE_URL is not configured');
  }
  return value;
}

function sslConfiguration() {
  const mode = (process.env.DATABASE_SSL_MODE || 'verify-full').toLowerCase();
  if (mode === 'disable') return false;
  if (mode === 'require') return { rejectUnauthorized: false };
  if (mode === 'verify-full') return { rejectUnauthorized: true };
  throw configurationError('DATABASE_SSL_MODE must be disable, require, or verify-full');
}

function poolSize() {
  const raw = Number.parseInt(process.env.DATABASE_POOL_MAX || '5', 10);
  if (!Number.isInteger(raw) || raw < 1 || raw > 20) {
    throw configurationError('DATABASE_POOL_MAX must be an integer from 1 to 20');
  }
  return raw;
}

async function buildPool() {
  const { Pool } = await import('pg');
  const pool = new Pool({
    connectionString: databaseUrl(),
    ssl: sslConfiguration(),
    max: poolSize(),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: true
  });
  pool.on('error', () => {
    // Deliberately do not print connection strings or provider details.
  });
  return pool;
}

export async function getDatabasePool() {
  if (!poolPromise) poolPromise = buildPool();
  return poolPromise;
}

export async function withDatabaseClient(operation) {
  const pool = await getDatabasePool();
  const client = await pool.connect();
  try {
    return await operation(client);
  } finally {
    client.release();
  }
}

export async function withTransaction(operation) {
  return withDatabaseClient(async (client) => {
    await client.query('BEGIN');
    try {
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

export async function withTenantTransaction(organizationId, operation) {
  if (!organizationId) {
    throw configurationError('Tenant transaction requires organizationId');
  }
  return withTransaction(async (client) => {
    await client.query(
      "SELECT set_config('app.organization_id', $1, true)",
      [String(organizationId)]
    );
    return operation(client);
  });
}

export async function databaseHealth() {
  if (!process.env.DATABASE_URL) {
    return { configured: false, status: 'CONFIGURATION_REQUIRED' };
  }
  const started = Date.now();
  try {
    return await withDatabaseClient(async (client) => {
      const result = await client.query(
        "SELECT current_database() AS database_name, now() AS database_time"
      );
      return {
        configured: true,
        status: 'READY',
        latencyMs: Date.now() - started,
        databaseTime: result.rows[0]?.database_time ?? null
      };
    });
  } catch {
    return {
      configured: true,
      status: 'DEGRADED',
      latencyMs: Date.now() - started
    };
  }
}

export async function closeDatabasePool() {
  if (!poolPromise) return;
  const pool = await poolPromise;
  poolPromise = undefined;
  await pool.end();
}
