import { databaseHealth } from '../../../src/runtime/database.mjs';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  const database = await databaseHealth();
  const oidcConfigured = Boolean(
    process.env.OIDC_ISSUER &&
    (process.env.OIDC_AUDIENCE || process.env.OIDC_CLIENT_ID)
  );
  const sessionConfigured = Boolean(
    process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32
  );

  const status =
    database.status === 'READY' && oidcConfigured && sessionConfigured
      ? 'READY'
      : database.status === 'DEGRADED'
        ? 'DEGRADED'
        : 'CONFIGURATION_REQUIRED';

  response.status(200).json({
    service: 'MAKSR Runtime Production Layer',
    status,
    components: {
      database,
      openIdConnect: {
        configured: oidcConfigured,
        status: oidcConfigured ? 'READY_FOR_VERIFICATION' : 'CONFIGURATION_REQUIRED'
      },
      sessionSecurity: {
        configured: sessionConfigured,
        status: sessionConfigured ? 'READY' : 'CONFIGURATION_REQUIRED'
      }
    },
    implementedFeatures: ['MKSR-F061', 'MKSR-F064', 'MKSR-F066', 'MKSR-F001', 'MKSR-F002'],
    environment: process.env.VERCEL_ENV ?? 'unknown',
    timestamp: new Date().toISOString()
  });
}
