import packageMetadata from '../../package.json' with { type: 'json' };
import { resolveAppClientContributions } from '@nocobase/app-client/plugins';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { expect, it } from 'vitest';
import { Breadcrumbs } from '../../client/components/breadcrumbs.js';
import { createApplicationRoutes } from '../../client/routes.js';
import AutomationTestingPage from '../../client/pages/settings/automation-testing/index.js';
import SettingsHomePage from '../../client/pages/settings/settings-home.js';
import { RouteTreeProvider } from '../../client/routing/route-context.js';
import { useRouteNavigation } from '../../client/routing/route-navigation.js';
import { createAuthenticatedClientRenderer } from '../helpers/authenticated-client.js';

const renderAuthenticatedClient = createAuthenticatedClientRenderer();
const { routes } = resolveAppClientContributions([
  {
    packageName: packageMetadata.name,
    source: 'application',
    routes: createApplicationRoutes(),
  },
]);

function Settings() {
  const { denied, loading } = useRouteNavigation(routes);
  return (
    <RouteTreeProvider routes={routes} access={{ denied, loading }}>
      <Breadcrumbs denied={denied} />
      <Routes>
        <Route path='/settings' element={<SettingsHomePage />} />
        <Route
          path='/settings/automation-testing'
          element={<AutomationTestingPage />}
        />
      </Routes>
    </RouteTreeProvider>
  );
}

it.each([
  ['zh-CN', '业务配置', '自动化测试平台', '应用管理', '系统设置', '面包屑'],
  [
    'en-US',
    'Business configuration',
    'Automation testing platform',
    'Applications',
    'System settings',
    'Breadcrumb',
  ],
])(
  'opens the blank platform from the shared business card in %s',
  async (locale, category, title, apps, settings, breadcrumb) => {
    await renderAuthenticatedClient(<Settings />, {
      route: '/settings',
      locale,
    });
    const business = await screen.findByRole('region', { name: category });
    const link = within(business).getByRole('link', {
      name: new RegExp(title),
    });
    const applicationLink = within(business).getByRole('link', {
      name: new RegExp(apps),
    });
    expect(link.className).toBe(applicationLink.className);
    expect(link).toHaveAttribute('href', '/main/settings/automation-testing');
    expect(applicationLink).toHaveAttribute(
      'href',
      '/main/settings/release-apps',
    );
    await userEvent.click(link);
    expect(
      await screen.findByRole('region', { name: title }),
    ).toBeEmptyDOMElement();
    const trail = screen.getByRole('navigation', { name: breadcrumb });
    expect(within(trail).getByRole('link', { name: settings })).toHaveAttribute(
      'href',
      '/main/settings',
    );
    expect(within(trail).getByText(title)).toBeVisible();
  },
);

it('hides the platform from a member with only application management access', async () => {
  await renderAuthenticatedClient(<Settings />, {
    route: '/settings',
    member: true,
    locale: 'zh-CN',
    grants: [
      {
        resource: { type: 'settings', id: 'release-apps' },
        actions: [{ action: 'read' }],
      },
    ],
  });
  const business = await screen.findByRole('region', { name: '业务配置' });
  expect(
    within(business).getByRole('link', { name: /应用管理/ }),
  ).toBeVisible();
  expect(
    within(business).queryByRole('link', { name: /自动化测试平台/ }),
  ).toBeNull();
});

it('shows the platform when its own read grant is assigned', async () => {
  await renderAuthenticatedClient(<Settings />, {
    route: '/settings',
    member: true,
    locale: 'en-US',
    grants: [
      {
        resource: { type: 'settings', id: 'automation-testing' },
        actions: [{ action: 'read' }],
      },
    ],
  });
  const business = await screen.findByRole('region', {
    name: 'Business configuration',
  });
  expect(
    within(business).getByRole('link', { name: /Automation testing platform/ }),
  ).toBeVisible();
  expect(
    within(business).queryByRole('link', { name: /Applications/ }),
  ).toBeNull();
});
