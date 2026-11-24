import { randomUUID } from 'node:crypto';
// @vitest-environment node
import { expect } from 'vitest';
import { createAppTest } from '@nocobase/app-testing/server';
import {
  DEFAULT_ADMIN_CREDENTIALS,
  signIn,
} from '@nocobase/app-plugin-authentication/testing';
import { createStandaloneServer } from '../../server/standalone.js';

const test = createAppTest({
  createServer: createStandaloneServer,
  config: {
    app: { publicOrigin: 'http://localhost' },
    auth: { secret: 'test-auth-secret-at-least-32-characters' },
  },
});

const operationKey = () => `${Date.now()}.${randomUUID()}`;
const json = (body: unknown, method = 'POST') => ({
  method,
  headers: {
    'content-type': 'application/json',
    origin: 'http://localhost',
    'Idempotency-Key': operationKey(),
  },
  body: JSON.stringify(body),
});

test('manages release applications with unique names and codes', async ({
  testApp,
}) => {
  expect((await testApp.request('/releaseApps')).status).toBe(401);
  const admin = await signIn(testApp, DEFAULT_ADMIN_CREDENTIALS);

  const key = operationKey();
  const createBody = {
    name: '  Order center  ',
    code: 'Order-Center',
    owner: ' Alice ',
    notes: 'Core ordering service',
  };
  const created = await admin.fetch('/releaseApps', {
    ...json(createBody),
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost',
      'Idempotency-Key': key,
    },
  });
  expect(created.status).toBe(201);
  const app = (await created.json()).data;
  expect(app).toMatchObject({
    name: 'Order center',
    code: 'order-center',
    owner: 'Alice',
    enabled: true,
    notes: 'Core ordering service',
  });

  const replayed = await admin.fetch('/releaseApps', {
    ...json(createBody),
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost',
      'Idempotency-Key': key,
    },
  });
  expect(replayed.status).toBe(201);
  expect(replayed.headers.get('idempotency-replayed')).toBe('true');
  expect((await replayed.json()).data.id).toBe(app.id);

  const duplicateName = await admin.fetch(
    '/releaseApps',
    json({ name: 'order center', code: 'different-code' }),
  );
  expect(duplicateName.status).toBe(409);
  expect((await duplicateName.json()).error.reason).toBe('APP_NAME_TAKEN');

  const duplicateCode = await admin.fetch(
    '/releaseApps',
    json({ name: 'Billing center', code: 'ORDER-CENTER' }),
  );
  expect(duplicateCode.status).toBe(409);
  expect((await duplicateCode.json()).error.reason).toBe('APP_CODE_TAKEN');

  const list = await admin.fetch('/releaseApps?page=1&pageSize=20');
  expect(list.status).toBe(200);
  expect((await list.json()).meta.total).toBe(1);

  const disabled = await admin.fetch(
    `/releaseApps/${app.id}`,
    json({ enabled: false }, 'PATCH'),
  );
  expect(disabled.status).toBe(200);
  expect((await disabled.json()).data.enabled).toBe(false);

  const disabledList = await admin.fetch(
    '/releaseApps?page=1&pageSize=20&enabled=false',
  );
  const disabledRows = (await disabledList.json()).data;
  expect(disabledRows).toHaveLength(1);
  expect(disabledRows[0]).toMatchObject({
    id: app.id,
    name: 'Order center',
    enabled: false,
  });

  const email = `release-member-${randomUUID()}@example.test`;
  const password = 'Release-member-123!';
  const registered = await testApp.request('/auth/sign-up/email', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost',
    },
    body: JSON.stringify({ name: 'Release member', email, password }),
  });
  expect(registered.ok).toBe(true);
  const member = await signIn(testApp, { email, password });
  expect((await member.fetch('/releaseApps')).status).toBe(403);
  expect(
    (
      await member.fetch(
        '/releaseApps',
        json({ name: 'Member app', code: 'member-app' }),
      )
    ).status,
  ).toBe(403);
});
