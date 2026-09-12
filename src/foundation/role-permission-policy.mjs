export function evaluatePermission({ assignedPermissions, requiredPermission }) {
  if (!requiredPermission) {
    throw new TypeError('requiredPermission is required');
  }
  const normalized = new Set(Array.isArray(assignedPermissions) ? assignedPermissions : []);
  return {
    allowed: normalized.has(requiredPermission),
    requiredPermission,
    decision: normalized.has(requiredPermission) ? 'ALLOW' : 'DENY'
  };
}

export function assertPermission(input) {
  const result = evaluatePermission(input);
  if (!result.allowed) {
    const error = new Error(`Permission denied: ${result.requiredPermission}`);
    error.code = 'PERMISSION_DENIED';
    throw error;
  }
  return true;
}
