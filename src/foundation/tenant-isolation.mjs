export function assertTenantAccess({ actorOrganizationIds, requestedOrganizationId }) {
  if (!requestedOrganizationId) {
    const error = new Error('Organization context is required');
    error.code = 'ORGANIZATION_CONTEXT_REQUIRED';
    throw error;
  }
  const allowed = Array.isArray(actorOrganizationIds) && actorOrganizationIds.includes(requestedOrganizationId);
  if (!allowed) {
    const error = new Error('Cross-tenant access denied');
    error.code = 'CROSS_TENANT_ACCESS_DENIED';
    throw error;
  }
  return true;
}

export function scopedRecord(record, organizationId) {
  if (!record || record.organizationId !== organizationId) {
    return null;
  }
  return record;
}
