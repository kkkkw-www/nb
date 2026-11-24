import {
  agentsRoute,
  modelsRoute,
  runtimesRoute,
  skillsRoute,
  usageRoute,
} from '@nocobase/app-plugin-agents/client/routes';
import { defineAppRoutes } from '@nocobase/app-client/plugins';
import { BookOpen, Bot, ChartColumn, Cpu, Server } from 'lucide-react';

/**
 * The Agents plugin registers no pages of its own. This puts its exported pages under one
 * "Agent management" section in the application's sidebar.
 */
const agentsManagementRoutes = defineAppRoutes([
  {
    name: 'agentManagement',
    navigation: { title: 'agentManagement.title', icon: Bot, order: 10 },
    children: [
      {
        ...agentsRoute,
        navigation: { title: 'agentManagement.agents', icon: Bot },
        breadcrumb: { title: 'agentManagement.agents' },
      },
      {
        ...runtimesRoute,
        navigation: { title: 'agentManagement.runtimes', icon: Server },
        breadcrumb: { title: 'agentManagement.runtimes' },
      },
      {
        ...skillsRoute,
        navigation: { title: 'agentManagement.skills', icon: BookOpen },
        breadcrumb: { title: 'agentManagement.skills' },
      },
      {
        ...usageRoute,
        navigation: { title: 'agentManagement.usage', icon: ChartColumn },
        breadcrumb: { title: 'agentManagement.usage' },
      },
      {
        ...modelsRoute,
        navigation: { title: 'agentManagement.models', icon: Cpu },
        breadcrumb: { title: 'agentManagement.models' },
      },
    ],
  },
]);

export default agentsManagementRoutes;
