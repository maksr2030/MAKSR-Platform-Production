export const IdentityState = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DISABLED: 'DISABLED'
});

export function buildIdentity({ identityId, subjectType, displayName, state = IdentityState.ACTIVE }) {
  if (!identityId || !subjectType || !displayName) {
    throw new TypeError('identityId, subjectType, and displayName are required');
  }
  if (!Object.values(IdentityState).includes(state)) {
    throw new RangeError('Unsupported identity state');
  }
  return Object.freeze({ identityId, subjectType, displayName, state });
}

export function assertIdentityOperational(identity) {
  if (!identity || identity.state !== IdentityState.ACTIVE) {
    const error = new Error('Identity is not operational');
    error.code = 'IDENTITY_NOT_OPERATIONAL';
    throw error;
  }
  return true;
}
