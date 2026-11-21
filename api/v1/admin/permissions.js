import { secureHandler } from '../../../src/runtime/http.mjs';
import { listPermissions } from '../../../src/runtime/repositories.mjs';

export default secureHandler({
  methods: ['GET'],
  permission: 'organization.permissions.read',
  execute: async () => ({
    body: {
      permissions: await listPermissions()
    }
  })
});
