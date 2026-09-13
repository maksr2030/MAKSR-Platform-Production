import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseCloudSqlInstanceConnectionName,
  cloudSqlSovereigntyConfiguration
} from '../src/runtime/google-cloud-sql.mjs';

function withEnv(values, operation) {
  const before = {};
  for (const [key, value] of Object.entries(values)) {
    before[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return operation();
  } finally {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('Cloud SQL connection name parser exposes project, region, and instance', () => {
  assert.deepEqual(
    parseCloudSqlInstanceConnectionName('maksr-preview:me-central2:maksr-preview-db'),
    {
      projectId: 'maksr-preview',
      region: 'me-central2',
      instanceId: 'maksr-preview-db'
    }
  );
});

test('sovereign database profile accepts Dammam region and Saudi residency', () => {
  withEnv({
    CLOUD_SQL_INSTANCE_CONNECTION_NAME:
      'maksr-preview:me-central2:maksr-preview-db',
    CLOUD_SQL_EXPECTED_REGION: 'me-central2',
    DATABASE_RESIDENCY_COUNTRY: 'SA'
  }, () => {
    const result = cloudSqlSovereigntyConfiguration();
    assert.equal(result.region, 'me-central2');
    assert.equal(result.residencyCountry, 'SA');
  });
});

test('sovereign database profile fails closed on region drift', () => {
  withEnv({
    CLOUD_SQL_INSTANCE_CONNECTION_NAME:
      'maksr-preview:europe-west1:maksr-preview-db',
    CLOUD_SQL_EXPECTED_REGION: 'me-central2',
    DATABASE_RESIDENCY_COUNTRY: 'SA'
  }, () => {
    assert.throws(
      () => cloudSqlSovereigntyConfiguration(),
      /does not match required region/
    );
  });
});

test('sovereign database profile fails closed on non-Saudi residency declaration', () => {
  withEnv({
    CLOUD_SQL_INSTANCE_CONNECTION_NAME:
      'maksr-preview:me-central2:maksr-preview-db',
    CLOUD_SQL_EXPECTED_REGION: 'me-central2',
    DATABASE_RESIDENCY_COUNTRY: 'BH'
  }, () => {
    assert.throws(
      () => cloudSqlSovereigntyConfiguration(),
      /must be SA/
    );
  });
});
