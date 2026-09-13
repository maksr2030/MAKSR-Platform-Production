import { configurationError } from './errors.mjs';

let runtimeStatePromise;

function databaseProvider() {
  const provider = (process.env.DATABASE_PROVIDER || 'url').trim().toLowerCase();
  if (!['url', 'gcp-cloud-sql'].includes(provider)) {
    throw configurationError('DATABASE_PROVIDER must be url or gcp-cloud-sql');
  }
  return provider;
}

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

async function buildUrlPool() {
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
  return {
    provider: 'url',
    pool,
    region: process.env.DATABASE_EXPECTED_REGION?.trim() || null,
    closeProvider: async () => {}
  };
}

async function buildGoogleCloudSqlPool() {
  const { buildGoogleCloudSqlRuntime } = await import('./google-cloud-sql.mjs');
  return buildGoogleCloudSqlRuntime({ max: poolSize() });
}

async function buildRuntimeState() {
  return databaseProvider() === 'gcp-cloud-sql'
    ? buildGoogleCloudSqlPool()
    : buildUrlPool();
}

async function getRuntimeState() {
  if (!runtimeStatePromise) runtimeStatePromise = buildRuntimeState();
  return runtimeStatePromise;
}

export function databaseRuntimeProfile() {
  const provider = databaseProvider();
  if (provider === 'gcp-cloud-sql') {
    return {
      provider,
      expectedRegion: process.env.CLOUD_SQL_EXPECTED_REGION?.trim() || 'me-central2',
      residencyCountry: process.env.DATABASE_RESIDENCY_COUNTRY?.trim() || 'SA'
    };
  }
  return {
    provider,
    expectedRegion: process.env.DATABASE_EXPECTED_REGION?.trim() || null,
    residencyCountry: process.env.DATABASE_RESIDENCY_COUNTRY?.trim() || null
  };
}

export async function getDatabasePool() {
  return (await getRuntimeState()).pool;
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
  const profile = databaseRuntimeProfile();
  const configured = profile.provider === 'gcp-cloud-sql'
    ? Boolean(
        process.env.CLOUD_SQL_INSTANCE_CONNECTION_NAME &&
        process.env.CLOUD_SQL_DATABASE &&
        process.env.GCP_PROJECT_ID &&
        process.env.GCP_PROJECT_NUMBER &&
        process.env.GCP_SERVICE_ACCOUNT_EMAIL &&
        process.env.GCP_WORKLOAD_IDENTITY_POOL_ID &&
        process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID
      )
    : Boolean(process.env.DATABASE_URL);

  if (!configured) {
    return {
      configured: false,
      status: 'CONFIGURATION_REQUIRED',
      provider: profile.provider,
      expectedRegion: profile.expectedRegion,
      residencyCountry: profile.residencyCountry
    };
  }

  const started = Date.now();
  try {
    const runtime = await getRuntimeState();
    return await withDatabaseClient(async (client) => {
      const result = await client.query(
        "SELECT current_database() AS database_name, now() AS database_time"
      );
      return {
        configured: true,
        status: 'READY',
        provider: runtime.provider,
        expectedRegion: runtime.region ?? profile.expectedRegion,
        residencyCountry: profile.residencyCountry,
        latencyMs: Date.now() - started,
        databaseTime: result.rows[0]?.database_time ?? null
      };
    });
  } catch {
    return {
      configured: true,
      status: 'DEGRADED',
      provider: profile.provider,
      expectedRegion: profile.expectedRegion,
      residencyCountry: profile.residencyCountry,
      latencyMs: Date.now() - started
    };
  }
}

export async function closeDatabasePool() {
  if (!runtimeStatePromise) return;
  const state = await runtimeStatePromise;
  runtimeStatePromise = undefined;
  await state.pool.end();
  await state.closeProvider();
}
