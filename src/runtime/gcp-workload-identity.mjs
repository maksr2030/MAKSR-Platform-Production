import { getVercelOidcToken } from '@vercel/oidc';
import { ExternalAccountClient } from 'google-auth-library';
import { configurationError } from './errors.mjs';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw configurationError(`${name} is not configured`);
  return value;
}

export function googleWorkloadIdentityConfiguration() {
  return Object.freeze({
    projectId: required('GCP_PROJECT_ID'),
    projectNumber: required('GCP_PROJECT_NUMBER'),
    serviceAccountEmail: required('GCP_SERVICE_ACCOUNT_EMAIL'),
    workloadIdentityPoolId: required('GCP_WORKLOAD_IDENTITY_POOL_ID'),
    workloadIdentityPoolProviderId: required('GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID')
  });
}

export async function buildVercelGoogleExternalAccountClient() {
  const config = googleWorkloadIdentityConfiguration();
  const client = ExternalAccountClient.fromJSON({
    type: 'external_account',
    audience:
      `//iam.googleapis.com/projects/${config.projectNumber}` +
      `/locations/global/workloadIdentityPools/${config.workloadIdentityPoolId}` +
      `/providers/${config.workloadIdentityPoolProviderId}`,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url:
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/` +
      `${config.serviceAccountEmail}:generateAccessToken`,
    subject_token_supplier: {
      getSubjectToken: async () => getVercelOidcToken({
        project: process.env.VERCEL_PROJECT_ID || undefined,
        team: process.env.VERCEL_TEAM_ID || undefined,
        expirationBufferMs: 5 * 60 * 1000
      })
    }
  });

  if (!client) {
    throw configurationError('Unable to construct Google Cloud external account client');
  }
  return client;
}
