import { readJsonBody, secureHandler } from '../../../src/runtime/http.mjs';
import {
  getOrganization,
  updateOrganization
} from '../../../src/runtime/repositories.mjs';
import { assertPermission } from '../../../src/runtime/request-security-context.mjs';

export default secureHandler({
  methods: ['GET', 'PATCH'],
  permission: 'organization.read',
  execute: async ({ request, context }) => {
    if (request.method === 'GET') {
      return {
        body: {
          organization: await getOrganization(context.organization.organizationId)
        }
      };
    }

    assertPermission(context, 'organization.manage');
    const body = await readJsonBody(request);
    const organization = await updateOrganization({
      organizationId: context.organization.organizationId,
      actorIdentityId: context.identity.identityId,
      legalName: body.legalName,
      displayName: body.displayName
    });
    return { body: { organization } };
  }
});
