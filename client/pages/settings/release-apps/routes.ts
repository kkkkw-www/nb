import {
  defineAppRoutes,
  type AppClientRouteContribution,
} from '@nocobase/app-client/plugins';
import { Boxes } from 'lucide-react';

const releaseAppsRoutes: AppClientRouteContribution = defineAppRoutes([
  {
    parent: 'settingsBusiness',
    name: 'settingsReleaseApps',
    path: '/release-apps',
    auth: 'required',
    authz: {
      resource: { type: 'settings', id: 'release-apps' },
      action: 'read',
    },
    navigation: {
      title: 'releaseApps.title',
      description: 'releaseApps.description',
      icon: Boxes,
    },
    breadcrumb: { title: 'releaseApps.title' },
    componentLoader: () => import('./index.js'),
    children: [
      {
        name: 'settingsReleaseAppCreate',
        path: 'create',
        authz: {
          resource: { type: 'settings', id: 'release-apps' },
          action: 'create',
        },
        presentation: { kind: 'dialog', title: 'releaseApps.create' },
        componentLoader: () => import('./form.js'),
      },
      {
        name: 'settingsReleaseAppEdit',
        path: ':appId/edit',
        authz: {
          resource: { type: 'settings', id: 'release-apps' },
          action: 'update',
        },
        presentation: { kind: 'drawer', title: 'releaseApps.edit' },
        componentLoader: () => import('./form.js'),
      },
    ],
  },
]);

export default releaseAppsRoutes;
