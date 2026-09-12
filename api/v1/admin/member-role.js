import { readJsonBody, secureHandler } from '../../../src/runtime/http.mjs';
import { setMemberRole } from '../../../src/runtime/repositories.mjs';

export default secureHandler({
  methods: ['POST'],
  permission: 'organization.roles.manage',
  execute: async ({ request, context }) => {
    const body = await readJsonBody(request);
    const assignment = await setMemberRole({
      organizationId: context.organization.organizationId,
      actorIdentityId: context.identity.identityId,
      identityId: body.identityId,
      roleId: body.roleId,
      assigned: body.assigned !== false
    });
    return { body: { assignment } };
  }
});
