import { defineSeed } from '@nocobase/db';
import { encodeAuthorizationTitle } from '@nocobase/authorization/core';

export default defineSeed({
  name: '202611250001_release_permission_sets',
  async run({ query }) {
    const jobs = [
      { key: 'release-applicant', title: 'Release applicant', actions: ['read', 'submit'] },
      { key: 'release-reviewer', title: 'Release reviewer', actions: ['read', 'review'] },
      { key: 'release-registrar', title: 'Release registrar', actions: ['read', 'register'] },
    ];
    for (const job of jobs) {
      if (await query.selectFrom('authorizationPermissionSets').select('id').where('key', '=', job.key).executeTakeFirst()) continue;
      const now = new Date();
      await query.insertInto('authorizationPermissionSets').values({
        id: job.key, key: job.key, title: encodeAuthorizationTitle(job.title),
        grants: JSON.stringify([
          { resource: { type: 'page', id: 'releaseRequests' }, actions: [{ action: 'access' }] },
          { resource: { type: 'settings', id: 'release-requests' }, actions: job.actions.map(action => ({ action })) },
        ]), createdAt: now, updatedAt: now,
      }).execute();
    }
    // Recipients must be explicitly chosen through User management. Never grant to authenticated:*.
  },
});
