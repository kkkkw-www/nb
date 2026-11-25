import AutomationTestingProvider from './automation-testing.js';
import ReleaseRequestsProvider from './release-requests.js';
import NotificationManagementProvider from './notification-management.js';
import ReleaseAppsProvider from './release-apps.js';
import SubmissionProvider from './submission.js';
import AgentChatProvider from './agent-chat.js';
import type { ApplicationServiceProviderConstructor } from '@nocobase/app-server/application';

const serviceProviders: readonly ApplicationServiceProviderConstructor[] = [
  SubmissionProvider,
  ReleaseAppsProvider,
  AutomationTestingProvider,
  ReleaseRequestsProvider,
  NotificationManagementProvider,
  AgentChatProvider,
];

export default serviceProviders;
