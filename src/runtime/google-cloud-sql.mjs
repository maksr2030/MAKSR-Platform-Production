import { Connector } from '@google-cloud/cloud-sql-connector';
import { configurationError } from './errors.mjs';
import {
  buildVercelGoogleExternalAccountClient,
  googleWorkloadIdentityConfiguration
} from './gcp-workload-identity.mjs';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw configurationError(`${name} is not configured`);
  return value;
}

export function parseCloudSqlInstanceConnectionName(value) {
  const parts = String(value || '').trim().split(':');
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw configurationError(
      'CLOUD_SQL_INSTANCE_CONNECTION_NAME must use project:region:instance'
    );
  }
  return Object.freeze({
    projectId: parts[0],
    region: parts[1],
    instanceId: parts[2]
  });
}

export function cloudSqlSovereigntyConfiguration() {
  const instanceConnectionName = required('CLOUD_SQL_INSTANCE_CONNECTION_NAME');
  const parsed = parseCloudSqlInstanceConnectionName(instanceConnectionName);
  const expectedRegion = process.env.CLOUD_SQL_EXPECTED_REGION?.trim() || 'me-central2';
  const residencyCountry = process.env.DATABASE_RESIDENCY_COUNTRY?.trim() || 'SA';

  if (parsed.region !== expectedRegion) {
    throw configurationError(
      `Cloud SQL region ${parsed.region} does not match required region ${expectedRegion}`
    );
  }
  if (residencyCountry !== 'SA') {
    throw configurationError(
      'DATABASE_RESIDENCY_COUNTRY must be SA for the MAKSR sovereign database profile'
    );
  }

  return Object.freeze({
    instanceConnectionName,
    projectId: parsed.projectId,
    region: parsed.region,
    instanceId: parsed.instanceId,
    expectedRegion,
    residencyCountry
  });
}

function iamDatabaseUser(serviceAccountEmail) {
  const explicit = process.env.CLOUD_SQL_IAM_DATABASE_USER?.trim();
  if (explicit) return explicit;
  const suffix = '.gserviceaccount.com';
  if (!serviceAccountEmail.endsWith(suffix)) {
    throw configurationError(
      'CLOUD_SQL_IAM_DATABASE_USER is required when GCP_SERVICE_ACCOUNT_EMAIL is not a service account address'
    );
  }
  return serviceAccountEmail.slice(0, -suffix.length);
}

export async function buildGoogleCloudSqlRuntime({ max = 5 } = {}) {
  const sovereignty = cloudSqlSovereigntyConfiguration();
  const identity = googleWorkloadIdentityConfiguration();

  if (sovereignty.projectId !== identity.projectId) {
    throw configurationError('Cloud SQL instance project must match GCP_PROJECT_ID');
  }

  const authClient = await buildVercelGoogleExternalAccountClient();
  const connector = new Connector({ auth: authClient });

  try {
    const clientOptions = await connector.getOptions({
      instanceConnectionName: sovereignty.instanceConnectionName,
      ipType: 'PUBLIC',
      authType: 'IAM'
    });

    const { Pool } = await import('pg');
    const pool = new Pool({
      ...clientOptions,
      user: iamDatabaseUser(identity.serviceAccountEmail),
      database: required('CLOUD_SQL_DATABASE'),
      max,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 7_500,
      allowExitOnIdle: true
    });

    pool.on('error', () => {
      // Never emit credentials, instance connection names, or database identifiers.
    });

    return {
      provider: 'gcp-cloud-sql',
      pool,
      region: sovereignty.region,
      closeProvider: async () => connector.close()
    };
  } catch (error) {
    connector.close();
    throw error;
  }
}
