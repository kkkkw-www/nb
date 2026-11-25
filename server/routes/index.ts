import releaseRequestsRoutes from './release-requests.js';
import type { Application } from '@nocobase/app-server/application';
import type { AppRouteContribution } from '@nocobase/app-server/router';
import releaseAppsRoutes from './release-apps.js';

const routes: readonly AppRouteContribution<Application>[] = [
  releaseAppsRoutes,
  releaseRequestsRoutes,
];

export default routes;
