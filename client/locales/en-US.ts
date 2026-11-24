import fileUi from '../extensions/nocobase-file-component-ui/locales/en-US.js';
import agentChat from '../extensions/nocobase-agent-chat/locales/en-US.js';
import type { LocaleResource } from '@nocobase/i18n';

import systemEnUS from './system/en-US.js';

const enUS = {
  // The template's own copy: the shell, the sign-in pages, shared components and the homepage. Keep it in
  // `./system/` so a template upgrade can replace it without touching the application's copy below.
  ...systemEnUS,
  ...fileUi,
  releaseApps: {
    title: 'Applications',
    description:
      'Maintain the applications available for release requests. Applications are disabled, never deleted.',
    askAi: 'AI chat',
    create: 'New application',
    edit: 'Edit application',
    name: 'Application name',
    code: 'Application code',
    owner: 'Owner',
    notes: 'Notes',
    enabled: 'Enabled',
    status: 'Status',
    actions: 'Actions',
    all: 'All',
    enabledStatus: 'Enabled',
    disabledStatus: 'Disabled',
    enable: 'Enable',
    disable: 'Disable',
    editAction: 'Edit',
    search: 'Search name, code or owner',
    nameRequired: 'Enter the application name.',
    nameTaken: 'This application name is already in use.',
    codeTaken: 'This application code is already in use.',
    nameTooLong: 'The application name must be at most 120 characters.',
    codeTooLong: 'The application code must be at most 64 characters.',
    ownerTooLong: 'The owner must be at most 120 characters.',
    notesTooLong: 'Notes must be at most 2000 characters.',
    codeHint: 'Optional. When set, it must be unique across the system.',
    enabledHint:
      'A disabled application cannot be chosen in a new release request. Existing records stay visible.',
    createdSuccess: 'Created application “{{name}}”',
    savedSuccess: 'Saved application “{{name}}”',
    enabledSuccess: 'Enabled application “{{name}}”',
    disabledSuccess: 'Disabled application “{{name}}”',
    enableTitle: 'Enable “{{name}}”?',
    enableHint:
      'The application becomes available for new release requests again.',
    disableTitle: 'Disable “{{name}}”?',
    disableHint:
      'The application cannot be chosen in a new release request. Existing records stay visible.',
    actionsFor: 'Actions for {{name}}',
    noResults: 'No applications match the current filters.',
    emptyHint:
      'No applications yet. Create one before submitting a release request.',
    total: '{{count}} applications',
  },
  agentManagement: {
    title: 'Agent management',
    description:
      'Connect runtimes and manage agents, skills, model services and usage.',
    agents: 'Agents',
    runtimes: 'Runtimes',
    skills: 'Skills',
    usage: 'Usage',
    models: 'Model services',
    connectRuntime: 'Connect runtime',
    newSkill: 'New skill',
    skillDetail: 'Skill details',
  },
  chat: {
    ...agentChat.chat,
    source: {
      askAgent: 'Asked from a business page',
    },
  },
  // The application's copy goes here, one group per feature. A shared group such as `navigation` is extended by
  // spreading the system one first, `navigation: { ...systemEnUS.navigation, orders: 'Orders' }`, since a group
  // written here replaces the system group of the same name rather than merging with it.
};

/**
 * The shape every locale of this application follows, derived from the English wording above.
 *
 * Anything a plugin does not translate falls back to this namespace, so a term defined here is reused everywhere
 * without each plugin repeating it.
 */
export type AppResource = LocaleResource<typeof enUS>;

export default enUS;
