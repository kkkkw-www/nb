import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { createAppTest } from '@nocobase/app-testing/server';
import {
  DEFAULT_ADMIN_CREDENTIALS,
  signIn,
} from '@nocobase/app-plugin-authentication/testing';
import { createStandaloneServer } from '../../server/standalone.js';
const test = createAppTest({
  createServer: createStandaloneServer,
  scope: 'test',
  config: {
    app: { publicOrigin: 'http://localhost' },
    auth: { secret: 'test-auth-secret-at-least-32-characters' },
  },
});
const json = (
  body: unknown,
  key = `${Date.now()}.${randomUUID()}`,
  method = 'POST',
) => ({
  method,
  headers: {
    'content-type': 'application/json',
    origin: 'http://localhost',
    'Idempotency-Key': key,
  },
  body: JSON.stringify(body),
});

test('release lifecycle keeps review and actual release distinct, rejects duplicates and retains history', async ({
  testApp,
  connection,
}) => {
  const admin = await signIn(testApp, DEFAULT_ADMIN_CREDENTIALS);
  for (const path of [
    '/releaseRequests',
    '/releaseRequests/appOptions',
    '/releaseWorkflows',
    '/releaseWorkflows/executions',
  ])
    expect((await testApp.request(path)).status).toBe(401);
  const app = (
    await (
      await admin.fetch(
        '/releaseApps',
        json({ name: 'Synthetic order service' }),
      )
    ).json()
  ).data;
  const disabled = (
    await (
      await admin.fetch(
        '/releaseApps',
        json({ name: 'Disabled service', enabled: false }),
      )
    ).json()
  ).data;
  const create = { appId: app.id, description: 'Release reviewed changes' };
  expect(
    (
      await admin.fetch(
        '/releaseRequests',
        json({ ...create, appId: disabled.id }),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await admin.fetch(
        '/releaseRequests',
        json({ ...create, applicantId: 'spoof' }),
      )
    ).status,
  ).toBe(400);
  const key = `${Date.now()}.${randomUUID()}`;
  const submitted = await admin.fetch('/releaseRequests', json(create, key));
  expect(submitted.status).toBe(201);
  const row = (await submitted.json()).data;
  expect(row).toMatchObject({
    status: 'pending',
    appId: app.id,
    reviewResult: null,
    reviewedAt: null,
    releasedAt: null,
  });
  expect(row.applicantId).toBeTruthy();
  expect(row.appliedAt).toBeTruthy();
  expect(row.activeAppId).toBeUndefined();
  for (const path of [
    '/releaseRequests?page=1&pageSize=20',
    `/releaseRequests?appId=${app.id}&status=pending`,
    '/releaseWorkflows/executions?page=1&pageSize=20',
  ]) {
    const list = await admin.fetch(path);
    expect(list.status).toBe(200);
    expect((await list.json()).data).toContainEqual(
      expect.objectContaining({ id: row.id }),
    );
  }
  const replay = await admin.fetch('/releaseRequests', json(create, key));
  expect(replay.status).toBe(201);
  expect(replay.headers.get('Idempotency-Replayed')).toBe('true');
  expect((await replay.json()).data.id).toBe(row.id);
  expect((await admin.fetch('/releaseRequests', json(create))).status).toBe(
    409,
  );
  const fire = (transition: string, version: number, extra = {}) =>
    admin.fetch(
      `/releaseRequests/${row.id}/fire`,
      json({ transition, version, ...extra }),
    );
  expect((await fire('succeed', row.lifecycleVersion)).status).toBe(400);
  expect((await fire('reject', row.lifecycleVersion)).status).toBe(400);
  expect(
    (
      await fire('approve', row.lifecycleVersion, {
        releasedAt: '2026-01-01T00:00:00Z',
      })
    ).status,
  ).toBe(400);
  const approved = await fire('approve', row.lifecycleVersion, {
    note: 'Reviewed',
  });
  expect(approved.status).toBe(200);
  const waiting = (await approved.json()).data;
  expect(waiting).toMatchObject({
    status: 'awaitingRelease',
    reviewResult: 'approved',
    reviewNote: 'Reviewed',
    releasedAt: null,
  });
  expect(waiting.reviewedAt).toBeTruthy();
  expect(waiting.reviewerId).toBe(row.applicantId);
  expect((await admin.fetch('/releaseRequests', json(create))).status).toBe(
    409,
  );
  expect((await fire('approve', 0)).status).toBe(409);
  expect((await fire('fail', waiting.lifecycleVersion)).status).toBe(400);
  const actual = '2026-11-25T01:02:00.000Z';
  const succeeded = await fire('succeed', waiting.lifecycleVersion, {
    releasedAt: actual,
    note: 'Deployment verified',
  });
  expect(succeeded.status).toBe(200);
  expect((await succeeded.json()).data).toMatchObject({
    status: 'released',
    releasedAt: actual,
    reviewedAt: waiting.reviewedAt,
  });
  const detail = (
    await (await admin.fetch(`/releaseRequests/${row.id}`)).json()
  ).data;
  expect(
    detail.history.transitions.map((e: { transition: string }) => e.transition),
  ).toEqual(['$create', 'approve', 'succeed']);
  expect(detail.record.registrarId).toBeTruthy();
  expect(detail.record.registeredAt).toBeTruthy();
  expect((await fire('fail', 2, { note: 'Too late' })).status).toBe(409);
  // Rejection and failure free the application for a NEW request without overwriting the old record.
  const second = (
    await (await admin.fetch('/releaseRequests', json(create))).json()
  ).data;
  expect(
    (
      await admin.fetch(
        `/releaseRequests/${second.id}/fire`,
        json({
          transition: 'reject',
          version: second.lifecycleVersion,
          note: 'Needs changes',
        }),
      )
    ).status,
  ).toBe(200);
  const third = (
    await (await admin.fetch('/releaseRequests', json(create))).json()
  ).data;
  expect(
    (
      await admin.fetch(
        `/releaseRequests/${third.id}/fire`,
        json({ transition: 'approve', version: third.lifecycleVersion }),
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await admin.fetch(
        `/releaseRequests/${third.id}/fire`,
        json({
          transition: 'fail',
          version: third.lifecycleVersion + 1,
          note: 'Health check failed',
        }),
      )
    ).status,
  ).toBe(200);
  const failed = (
    await (await admin.fetch(`/releaseRequests/${third.id}`)).json()
  ).data.record;
  expect(failed).toMatchObject({
    status: 'failed',
    releasedAt: null,
    releaseNote: 'Health check failed',
  });
  const concurrent = await Promise.all([
    admin.fetch('/releaseRequests', json(create)),
    admin.fetch('/releaseRequests', json(create)),
  ]);
  expect(concurrent.map((r) => r.status).sort()).toEqual([201, 409]);
  const active = await connection
    .repository('releaseRequests')
    .findOne({ filter: { activeAppId: app.id } });
  const decisions = await Promise.all(
    ['approve', 'reject'].map((transition) =>
      admin.fetch(
        `/releaseRequests/${active!.id}/fire`,
        json({
          transition,
          version: active!.lifecycleVersion,
          note: 'Concurrent review',
        }),
      ),
    ),
  );
  expect(decisions.map((response) => response.status).sort()).toEqual([
    200, 409,
  ]);
  expect(
    await connection
      .repository('lifecycleTransitions')
      .count({ filter: { recordId: active!.id } }),
  ).toBe(2);
  expect(
    (
      await admin.fetch(
        `/releaseApps/${app.id}`,
        json({ enabled: false, name: 'Renamed service' }, undefined, 'PATCH'),
      )
    ).status,
  ).toBe(200);
  expect(
    (await (await admin.fetch(`/releaseRequests/${row.id}`)).json()).data.record
      .appName,
  ).toBe('Synthetic order service');
  expect(await connection.repository('releaseRequests').count()).toBe(4);
  const workflow = await admin.fetch('/releaseWorkflows');
  expect(workflow.status).toBe(200);
  expect((await workflow.json()).data.description.states).toHaveLength(5);
  expect(
    (await admin.fetch(`/releaseWorkflows/executions/${row.id}`)).status,
  ).toBe(200);
  const swagger = await admin.fetch('/swagger');
  expect(swagger.status).toBe(200);
});

test('ordinary explicitly assigned jobs enforce submit, review and registration independently', async ({
  testApp,
  connection,
}) => {
  const admin = await signIn(testApp, DEFAULT_ADMIN_CREDENTIALS);
  const accounts = [];
  for (const [index, job] of [
    'release-applicant',
    'release-reviewer',
    'release-registrar',
    null,
  ].entries()) {
    const account = {
      name: `Synthetic user ${index}`,
      username: `releaseuser${index}`,
      email: `releaseuser${index}@example.test`,
      password: 'Synthetic-release-123!',
      ...(job ? { roleScopes: { app: [job] } } : {}),
    };
    const result = await admin.fetch('/users', json(account));
    expect(result.status).toBe(201);
    accounts.push(await signIn(testApp, account));
  }
  const [applicant, reviewer, registrar, member] = accounts;
  const app = (
    await (
      await admin.fetch('/releaseApps', json({ name: 'Permission service' }))
    ).json()
  ).data;
  const input = { appId: app.id, description: 'Permission boundary test' };
  expect((await member.fetch('/releaseRequests')).status).toBe(403);
  expect((await member.fetch('/releaseRequests', json(input))).status).toBe(
    403,
  );
  expect((await applicant.fetch('/releaseApps')).status).toBe(403);
  const options = await applicant.fetch('/releaseRequests/appOptions');
  expect(options.status).toBe(200);
  expect((await options.json()).data).toEqual([{ id: app.id, name: app.name }]);
  const submitted = await applicant.fetch('/releaseRequests', json(input));
  expect(submitted.status).toBe(201);
  const row = (await submitted.json()).data;
  // A different user with a different key cannot create another active request.
  const another = await admin.fetch('/releaseRequests', json(input));
  expect(another.status).toBe(409);
  for (const transition of ['approve', 'reject', 'succeed', 'fail']) {
    expect(
      (
        await applicant.fetch(
          `/releaseRequests/${row.id}/fire`,
          json({ transition, version: 0, note: 'Unauthorized' }),
        )
      ).status,
    ).toBe(403);
  }
  expect((await reviewer.fetch('/releaseRequests', json(input))).status).toBe(
    403,
  );
  expect(
    (
      await reviewer.fetch(
        `/releaseRequests/${row.id}/fire`,
        json({ transition: 'succeed', version: 0 }),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await registrar.fetch(
        `/releaseRequests/${row.id}/fire`,
        json({ transition: 'approve', version: 0 }),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await reviewer.fetch(
        `/releaseRequests/${row.id}/fire`,
        json({ transition: 'approve', version: row.lifecycleVersion }),
      )
    ).status,
  ).toBe(200);
  const key = `${Date.now()}.${randomUUID()}`;
  const result = await registrar.fetch(
    `/releaseRequests/${row.id}/fire`,
    json({ transition: 'succeed', version: row.lifecycleVersion + 1 }, key),
  );
  expect(result.status).toBe(200);
  const success = (await result.json()).data;
  expect(success.releasedAt).toBeTruthy();
  expect(success.releasedAt).toBe(success.registeredAt);
  const replay = await registrar.fetch(
    `/releaseRequests/${row.id}/fire`,
    json({ transition: 'succeed', version: row.lifecycleVersion + 1 }, key),
  );
  expect(replay.status).toBe(200);
  expect(replay.headers.get('Idempotency-Replayed')).toBe('true');
  expect((await applicant.fetch(`/releaseRequests/${row.id}`)).status).toBe(
    200,
  );
  expect((await applicant.fetch('/releaseWorkflows')).status).toBe(403);
  expect(
    (await member.fetch(`/releaseWorkflows/executions/${row.id}`)).status,
  ).toBe(403);
  expect(
    await connection
      .repository('lifecycleTransitions')
      .count({ filter: { recordId: row.id } }),
  ).toBe(3);
});
