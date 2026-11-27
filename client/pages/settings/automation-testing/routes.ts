import {
  defineAppRoutes,
  type AppClientRouteContribution,
} from '@nocobase/app-client/plugins';
import { FlaskConical } from 'lucide-react';

const automationTestingRoutes: AppClientRouteContribution = defineAppRoutes([
  {
    parent: 'settingsBusiness',
    name: 'settingsAutomationTesting',
    path: '/automation-testing',
    auth: 'required',
    authz: {
      resource: { type: 'settings', id: 'automation-testing' },
      action: 'read',
    },
    navigation: {
      title: 'automationTesting.title',
      description: 'automationTesting.description',
      icon: FlaskConical,
    },
    breadcrumb: { title: 'automationTesting.title' },
    componentLoader: () => import('./index.js'),
  },
]);

export default automationTestingRoutes;
