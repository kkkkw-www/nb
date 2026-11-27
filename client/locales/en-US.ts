import fileUi from '../extensions/nocobase-file-component-ui/locales/en-US.js';
import agentChat from '../extensions/nocobase-agent-chat/locales/en-US.js';
import type { LocaleResource } from '@nocobase/i18n';

import systemEnUS from './system/en-US.js';

const enUS = {
  // The template's own copy: the shell, the sign-in pages, shared components and the homepage. Keep it in
  // `./system/` so a template upgrade can replace it without touching the application's copy below.
  ...systemEnUS,
  ...fileUi,
  releaseRequests: {
    duplicate:
      'This application already has a request awaiting review or release.',
    disabled: 'Only enabled applications can be requested.',
    permissions: {
      read: 'View records',
      submit: 'Request release',
      review: 'Review requests',
      register: 'Register release results',
    },
    title: 'Release records',
    submit: 'Request release',
    detail: 'Release request',
    app: 'Application',
    status: 'Status',
    applicant: 'Applicant',
    appliedAt: 'Application time',
    reviewedAt: 'Review time',
    releasedAt: 'Actual release time',
    all: 'All statuses',
    records: 'View records',
    description: 'Application notes',
    searchApps: 'Find enabled application',
    chooseApp: 'Choose an application',
    noApps: 'No enabled applications found.',
    previous: 'Previous',
    next: 'Next',
    note: 'Notes',
    timeHint: 'Leave blank to use the registration time.',
    cancel: 'Cancel',
    history: 'Operation history',
    workflows: 'Workflow management',
    workflowDescription: 'Inspect release definitions and execution history.',
    definitions: 'Definitions',
    executions: 'Executions',
    process: 'Application release',
    diagram: 'Process diagram',
    parameters: 'Parameters',
    noParameters:
      'No adjustable parameters. Reviewers and registrars are controlled by business permissions.',
    showStep: 'Show step {{step}}',
    states: {
      pending: 'Pending review',
      rejected: 'Rejected',
      awaitingRelease: 'Awaiting release',
      released: 'Released',
      failed: 'Release failed',
    },
    transitions: {
      $create: 'Submit',
      approve: 'Approve',
      reject: 'Reject',
      succeed: 'Register success',
      fail: 'Register failure',
    },
    results: {
      approved: 'Approved',
      rejected: 'Rejected',
    },
    fields: {
      appName: 'Application',
      status: 'Status',
      applicantName: 'Applicant',
      appliedAt: 'Application time',
      description: 'Application notes',
      reviewerName: 'Reviewer',
      reviewedAt: 'Review time',
      reviewResult: 'Review result',
      reviewNote: 'Review notes',
      registrarName: 'Result registrar',
      registeredAt: 'Registration time',
      releasedAt: 'Actual release time',
      releaseNote: 'Release notes',
    },
    workflowLabels: {
      processDiagram: 'Process diagram',
      history: 'History',
      historyHint: 'Select a step to inspect its recorded state.',
      step: 'Step',
      transition: 'Action',
      to: 'To',
      actor: 'Actor',
      time: 'Time',
      noHistory: 'No history.',
      effects: 'Effects',
      effect: 'Effect',
      state: 'State',
      attempts: 'Attempts',
      error: 'Error',
      noEffects: 'No automatic deployment or external effects.',
      executionParameters: 'Recorded parameters',
      snapshotHint: 'No configurable parameters.',
      from: 'From',
    },
  },
  releaseApps: {
    delete: 'Delete',
    deleteTitle: 'Delete “{{name}}”?',
    deleteHint:
      'This cannot be undone. Existing release records will be preserved.',
    deletedSuccess: 'Deleted application “{{name}}”',
    alreadyDeleted: 'Application “{{name}}” has already been deleted.',
    title: 'Applications',
    description: 'Maintain the applications available for release requests.',
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
