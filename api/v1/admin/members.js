import { readJsonBody, secureHandler } from '../../../src/runtime/http.mjs';
import {
  listMembers,
  setMembershipStatus
} from '../../../src/runtime/repositories.mjs';
import { assertPermission } from '../../../src/runtime/request-security-context.mjs';

export default secureHandler({
  methods: ['GET', 'PATCH'],
  permission: 'organization.members.read',
  execute: async ({ request, context }) => {
    const organizationId = context.organization.organizationId;
    if (request.method === 'GET') {
      return { body: { members: await listMembers(organizationId) } };
    }

    assertPermission(context, 'organization.members.manage');
    const body = await readJsonBody(request);
    const membership = await setMembershipStatus({
      organizationId,
      actorIdentityId: context.identity.identityId,
      identityId: body.identityId,
      status: body.status
    });
    return { body: { membership } };
  }
});
