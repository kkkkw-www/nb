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
import ReleaseRequestsPage from '../../client/pages/release-requests/index.js';
import CreateRequest from '../../client/pages/release-requests/create.js';
import RequestDetailPage from '../../client/pages/release-requests/detail.js';
import type { ReleaseRequest } from '../../client/pages/release-requests/model.js';
import enUS from '../../client/locales/en-US.js';
import zhCN from '../../client/locales/zh-CN.js';
import { renderSettingsClient } from '../helpers/settings-client.js';
const namespace = 'nb-release-test';
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
const request: ReleaseRequest = {
  id: 'request-one',
  appId: 'one',
  appName: 'Synthetic app',
  status: 'pending',
  lifecycleVersion: 0,
  applicantId: 'user-one',
  applicantName: 'Synthetic applicant',
  appliedAt: '2026-11-25T01:00:00Z',
  description: 'Release notes',
  reviewerId: null,
  reviewerName: null,
  reviewedAt: null,
  reviewResult: null,
  reviewNote: null,
  registrarId: null,
  registrarName: null,
  registeredAt: null,
  releasedAt: null,
  releaseNote: null,
};
function pages() {
  return (
    <Routes>
      <Route path='/release-requests' element={<ReleaseRequestsPage />}>
        <Route path='create' element={<CreateRequest />} />
        <Route path=':id' element={<RequestDetailPage />} />
      </Route>
    </Routes>
  );
}
it('submits enabled application and reloads the records list', async () => {
  const user = userEvent.setup();
  let rows: ReleaseRequest[] = [];
  const calls = vi.fn(
    (call: { path: string; method: string; json?: unknown }) => {
      if (call.path === 'authorization/permissions')
        return { data: { unrestricted: true, permissions: [] } };
      if (call.path === 'releaseRequests/appOptions')
        return {
          data: [{ id: 'one', name: 'Synthetic app' }],
          meta: { total: 1 },
        };
      if (call.path === 'releaseRequests' && call.method === 'POST') {
        rows = [request];
        return { data: request };
      }
      return { data: rows, meta: { total: rows.length } };
    },
  );
  await renderSettingsClient(pages(), {
    route: '/release-requests',
    namespace,
    namespaces,
    services,
    fetch: answerApi(calls),
  });
  await user.click(
    await screen.findByRole('button', { name: 'Request release' }),
  );
  const dialog = await screen.findByRole('dialog');
  await user.click(
    within(dialog).getByRole('combobox', { name: 'Application' }),
  );
  await user.click(
    await screen.findByRole('option', { name: 'Synthetic app' }),
  );
  await user.type(
    within(dialog).getByRole('textbox', { name: 'Application notes' }),
    'Release notes',
  );
  await user.click(
    within(dialog).getByRole('button', { name: 'Request release' }),
  );
  expect(
    await screen.findByRole('link', { name: 'Synthetic app' }),
  ).toBeVisible();
  expect(calls).toHaveBeenCalledWith(
    expect.objectContaining({
      path: 'releaseRequests',
      method: 'POST',
      json: { appId: 'one', description: 'Release notes' },
    }),
  );
});
it('applicants can inspect records without seeing review or registration actions', async () => {
  const calls = (call: { path: string }) => {
    if (call.path === 'authorization/permissions')
      return {
        data: {
          unrestricted: false,
          permissions: [
            {
              resource: { type: 'settings', id: 'release-requests' },
              actions: [{ action: 'read' }, { action: 'submit' }],
            },
          ],
        },
      };
    if (call.path === 'releaseRequests/request-one')
      return { data: { record: request, history: { transitions: [] } } };
    return { data: [request], meta: { total: 1 } };
  };
  await renderSettingsClient(pages(), {
    route: '/release-requests/request-one',
    namespace,
    namespaces,
    services,
    fetch: answerApi(calls),
  });
  const dialog = await screen.findByRole('dialog');
  expect(
    await within(dialog).findByText('Release notes', { selector: 'dd' }),
  ).toBeVisible();
  for (const name of [
    'Approve',
    'Reject',
    'Register success',
    'Register failure',
  ])
    expect(
      within(dialog).queryByRole('button', { name }),
    ).not.toBeInTheDocument();
});
it('review moves a pending record to awaiting release with the actual time empty', async () => {
  const user = userEvent.setup();
  let row = { ...request };
  const calls = vi.fn((call: { path: string; method: string }) => {
    if (call.path === 'authorization/permissions')
      return { data: { unrestricted: true, permissions: [] } };
    if (call.path.endsWith('/fire')) {
      row = {
        ...row,
        status: 'awaitingRelease',
        lifecycleVersion: 1,
        reviewResult: 'approved',
        reviewedAt: '2026-11-25T02:00:00Z',
      };
      return { data: row };
    }
    if (call.path === 'releaseRequests/request-one')
      return { data: { record: row, history: { transitions: [] } } };
    return { data: [row], meta: { total: 1 } };
  });
  await renderSettingsClient(pages(), {
    route: '/release-requests/request-one',
    namespace,
    namespaces,
    services,
    fetch: answerApi(calls),
  });
  const dialog = await screen.findByRole('dialog');
  await user.click(
    await within(dialog).findByRole('button', { name: 'Approve' }),
  );
  await user.type(
    within(dialog).getByRole('textbox', { name: 'Notes' }),
    'Reviewed',
  );
  await user.click(within(dialog).getByRole('button', { name: 'Approve' }));
  expect(
    await within(dialog).findByRole('button', { name: 'Register success' }),
  ).toBeVisible();
  expect(row.releasedAt).toBeNull();
  expect(calls).toHaveBeenCalledWith(
    expect.objectContaining({
      path: 'releaseRequests/request-one/fire',
      json: { transition: 'approve', note: 'Reviewed', version: 0 },
    }),
  );
});
