import { secureHandler } from '../../../src/runtime/http.mjs';

export default secureHandler({
  methods: ['GET'],
  execute: async ({ context }) => ({
    body: {
      requestId: context.requestId,
      identity: context.identity,
      organization: context.organization,
      membershipStatus: context.membershipStatus,
      roles: context.roles,
      permissions: context.permissions
    }
  })
});
