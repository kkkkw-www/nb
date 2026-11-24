import { answerApi } from '@nocobase/app-testing/client';
import { apiClientToken, type ClientApplication } from '@nocobase/app-client';
import {
  AuthorizationClient,
  authorizationClientToken,
} from '@nocobase/app-plugin-authorization/client';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { expect, it, vi } from 'vitest';

import ReleaseAppsPage from '../../client/pages/settings/release-apps/index.js';
import ReleaseAppForm from '../../client/pages/settings/release-apps/form.js';
import type { ReleaseApp } from '../../client/pages/settings/release-apps/client.js';
import enUS from '../../client/locales/en-US.js';
import zhCN from '../../client/locales/zh-CN.js';
import { renderSettingsClient as renderWithApp } from '../helpers/settings-client.js';

const namespace = '@nocobase/release-apps-test';
const namespaces = {
  [namespace]: {
    'en-US': async () => ({ default: enUS }),
    'zh-CN': async () => ({ default: zhCN }),
  },
};
const services = (app: ClientApplication) =>
  app.container.instance(
    authorizationClientToken,
    new AuthorizationClient(app.container.resolve(apiClientToken)),
  );

function pages() {
  return (
    <Routes>
      <Route path='/settings/release-apps' element={<ReleaseAppsPage />}>
        <Route path='create' element={<ReleaseAppForm />} />
        <Route path=':appId/edit' element={<ReleaseAppForm />} />
      </Route>
    </Routes>
  );
}

function application(name: string, overrides: Partial<ReleaseApp> = {}) {
  return {
    id: name.toLowerCase().replaceAll(' ', '-'),
    name,
    code: null,
    owner: null,
    enabled: true,
    notes: null,
    createdAt: '2026-11-17T00:00:00.000Z',
    updatedAt: '2026-11-17T00:00:00.000Z',
    ...overrides,
  } satisfies ReleaseApp;
}

it('lists applications and creates one from the dialog', async () => {
  const user = userEvent.setup();
  let rows = [application('Order center')];
  const calls = vi.fn(
    (call: {
      path: string;
      method: string;
      json?: { name?: string; code?: string | null };
    }) => {
      if (call.path === 'authorization/permissions')
        return { data: { unrestricted: true, permissions: [] } };
      if (call.path === 'releaseApps' && call.method === 'GET')
        return { data: rows, meta: { total: rows.length } };
      if (call.path === 'releaseApps' && call.method === 'POST') {
        const created = application(call.json?.name ?? 'Untitled', {
          code: call.json?.code ?? null,
        });
        rows = [...rows, created];
        return { data: created };
      }
      return { data: rows, meta: { total: rows.length } };
    },
  );
  await renderWithApp(pages(), {
    route: '/settings/release-apps',
    namespace,
    namespaces,
    services,
    fetch: answerApi(calls),
  });

  expect(await screen.findByText('Order center')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'New application' }));
  const dialog = await screen.findByRole('dialog');
  await user.type(
    within(dialog).getByRole('textbox', { name: /Application name/ }),
    'Billing center',
  );
  await user.click(
    within(dialog).getByRole('button', { name: 'New application' }),
  );
  expect(
    await screen.findByText('Billing center', { exact: true }),
  ).toBeVisible();
  expect(calls).toHaveBeenCalledWith(
    expect.objectContaining({
      path: 'releaseApps',
      method: 'POST',
      json: expect.objectContaining({ name: 'Billing center' }),
    }),
  );
});

it('shows a duplicate name beside the field', async () => {
  const user = userEvent.setup();
  const rows = [application('Order center')];
  const calls = vi.fn(
    (call: {
      path: string;
      method: string;
      json?: { name?: string; code?: string | null };
    }) => {
      if (call.path === 'authorization/permissions')
        return { data: { unrestricted: true, permissions: [] } };
      if (call.path === 'releaseApps' && call.method === 'GET')
        return { data: rows, meta: { total: rows.length } };
      if (call.path === 'releaseApps' && call.method === 'POST') {
        if (
          rows.some(
            (row) =>
              row.name.toLocaleLowerCase() ===
              (call.json?.name ?? '').toLocaleLowerCase(),
          )
        )
          return Response.json(
            {
              error: {
                status: 'ALREADY_EXISTS',
                reason: 'APP_NAME_TAKEN',
                domain: 'release-apps',
                message: 'This application name is already in use.',
              },
            },
            { status: 409 },
          );
        return { data: application(call.json?.name ?? 'Untitled') };
      }
      return { data: rows, meta: { total: rows.length } };
    },
  );
  await renderWithApp(pages(), {
    route: '/settings/release-apps',
    namespace,
    namespaces,
    services,
    fetch: answerApi(calls),
  });
  await user.click(
    await screen.findByRole('button', { name: 'New application' }),
  );
  const dialog = await screen.findByRole('dialog');
  await user.type(
    within(dialog).getByRole('textbox', { name: /Application name/ }),
    'order center',
  );
  await user.click(
    within(dialog).getByRole('button', { name: 'New application' }),
  );
  expect(
    await within(dialog).findByText('This application name is already in use.'),
  ).toBeVisible();
  expect(
    within(dialog).getByRole('textbox', { name: /Application name/ }),
  ).toHaveAttribute('aria-invalid', 'true');
});
