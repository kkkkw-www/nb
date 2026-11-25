import path from 'node:path';
import { describeMigration } from '@nocobase/app-testing/server';
import { expect } from 'vitest';

describeMigration('202611250001_create_release_requests', {
  sources: [
    {
      packageName: 'release-requests-test',
      directory: path.resolve(
        import.meta.dirname,
        '../../database/main/migrations',
      ),
    },
  ],
  up: async ({ connection, expectCollection }) => {
    for (const name of [
      'releaseRequests',
      'lifecycleTransitions',
      'lifecycleEffectRuns',
    ])
      await expectCollection(name).toExist();
    const row = {
      id: 'one',
      appId: 'app',
      appName: 'Synthetic app',
      activeAppId: 'app',
      applicantId: 'user',
      applicantName: 'Synthetic user',
      appliedAt: new Date(),
      description: 'Test',
      status: 'pending',
      statusChangedAt: new Date(),
      lifecycleVersion: 0,
    };
    await connection.repository('releaseRequests').createOne({ values: row });
    await expect(
      connection
        .repository('releaseRequests')
        .createOne({ values: { ...row, id: 'two' } }),
    ).rejects.toThrow();
    await connection.repository('releaseRequests').updateOne({
      filter: { id: 'one' },
      values: { status: 'rejected', activeAppId: null },
    });
    await connection
      .repository('releaseRequests')
      .createOne({ values: { ...row, id: 'two', activeAppId: null } });
    expect(await connection.repository('releaseRequests').count()).toBe(2);
  },
  down: async ({ expectCollection }) => {
    for (const name of [
      'releaseRequests',
      'lifecycleTransitions',
      'lifecycleEffectRuns',
    ])
      await expectCollection(name).not.toExist();
  },
});
