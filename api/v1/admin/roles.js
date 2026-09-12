import { readJsonBody, secureHandler } from '../../../src/runtime/http.mjs';
import {
  createRole,
  listRoles,
  setRolePermissions
} from '../../../src/runtime/repositories.mjs';
import { assertPermission } from '../../../src/runtime/request-security-context.mjs';

export default secureHandler({
  methods: ['GET', 'POST', 'PATCH'],
  permission: 'organization.roles.read',
  execute: async ({ request, context }) => {
    const organizationId = context.organization.organizationId;
    if (request.method === 'GET') {
      return { body: { roles: await listRoles(organizationId) } };
    }

    assertPermission(context, 'organization.roles.manage');
    const body = await readJsonBody(request);
    if (request.method === 'POST') {
      const role = await createRole({
        organizationId,
        actorIdentityId: context.identity.identityId,
        roleKey: body.roleKey,
        displayName: body.displayName,
        permissions: body.permissions || []
      });
      return { status: 201, body: { role } };
    }

    const role = await setRolePermissions({
      organizationId,
      actorIdentityId: context.identity.identityId,
      roleId: body.roleId,
      permissions: body.permissions || []
    });
    return { body: { role } };
  }
});
