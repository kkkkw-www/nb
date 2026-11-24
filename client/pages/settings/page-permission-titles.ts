import type { PagePermissionTitles } from './page-permissions.js';

/** Permission labels for application pages without navigation/breadcrumb titles (including overlays).
 * Keys are existing route names; values are application translation keys.
 * Do not add navigation/breadcrumbs or change authorization ids just to name a permission.
 */
export const pagePermissionTitles: PagePermissionTitles = {
  // The template detail drawer shares the list page grant.
  notificationTemplate: 'settings.notificationTemplates',
  // The Agents plugin's overlay and child pages have no navigation or breadcrumb title of their own.
  'runtimes-connect': 'agentManagement.connectRuntime',
  'skills-new': 'agentManagement.newSkill',
  'skills-detail': 'agentManagement.skillDetail',
};
