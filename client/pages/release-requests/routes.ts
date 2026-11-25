import { defineAppRoutes } from '@nocobase/app-client/plugins';
import { Rocket, Workflow } from 'lucide-react';
const read = {
  resource: { type: 'settings', id: 'release-requests' },
  action: 'read',
} as const;
const workflowRead = {
  resource: { type: 'settings', id: 'release-workflows' },
  action: 'read',
} as const;
export default defineAppRoutes([
  {
    name: 'releaseRequests',
    path: '/release-requests',
    auth: 'required',
    authz: read,
    navigation: { title: 'releaseRequests.title', icon: Rocket },
    breadcrumb: { title: 'releaseRequests.title' },
    componentLoader: () => import('./index.js'),
    children: [
      {
        name: 'releaseRequestCreate',
        path: 'create',
        authz: { resource: read.resource, action: 'submit' },
        presentation: { kind: 'dialog', title: 'releaseRequests.submit' },
        componentLoader: () => import('./create.js'),
      },
      {
        name: 'releaseRequestDetail',
        path: ':id',
        authz: read,
        presentation: { kind: 'drawer', title: 'releaseRequests.detail' },
        componentLoader: () => import('./detail.js'),
      },
    ],
  },
  {
    name: 'releaseWorkflows',
    parent: 'settingsBusiness',
    path: '/workflows',
    auth: 'required',
    authz: workflowRead,
    navigation: {
      title: 'releaseRequests.workflows',
      description: 'releaseRequests.workflowDescription',
      icon: Workflow,
    },
    breadcrumb: { title: 'releaseRequests.workflows' },
    componentLoader: () => import('./workflows.js'),
    children: [
      {
        name: 'releaseWorkflowDefinitions',
        path: 'definitions',
        breadcrumb: { title: 'releaseRequests.definitions' },
        componentLoader: () => import('./definitions.js'),
        children: [
          {
            name: 'releaseWorkflowDefinition',
            path: 'release',
            breadcrumb: { title: 'releaseRequests.process' },
            componentLoader: () => import('./definition.js'),
          },
        ],
      },
      {
        name: 'releaseWorkflowExecutions',
        path: 'executions',
        breadcrumb: { title: 'releaseRequests.executions' },
        componentLoader: () => import('./executions.js'),
        children: [
          {
            name: 'releaseWorkflowExecution',
            path: ':id',
            breadcrumb: { title: 'releaseRequests.detail' },
            componentLoader: () => import('./execution.js'),
          },
        ],
      },
    ],
  },
]);
