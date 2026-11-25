import { defineMigration, type MigrationDefinition } from '@nocobase/db';

const migration: MigrationDefinition = defineMigration({
  name: '202611250001_create_release_requests',
  async up({ builder }) {
    await builder.createCollection('releaseRequests', (c) => {
      c.string('id', { length: 64 }).notNull();
      c.primary('id');
      c.string('appId', { length: 64 }).notNull();
      c.string('appName', { length: 120 }).notNull();
      c.string('activeAppId', { length: 64 }).nullable();
      c.unique('activeAppId', { name: 'uq_release_requests_active_app' });
      c.index('appId');
      c.string('applicantId', { length: 64 }).notNull();
      c.string('applicantName', { length: 200 }).notNull();
      c.datetimeTz('appliedAt').notNull();
      c.text('description').notNull();
      c.string('status', { length: 32 }).notNull();
      c.datetimeTz('statusChangedAt').notNull();
      c.integer('lifecycleVersion', { defaultValue: 0 }).notNull();
      c.index(['status', 'statusChangedAt']);
      c.string('reviewerId', { length: 64 }).nullable();
      c.string('reviewerName', { length: 200 }).nullable();
      c.datetimeTz('reviewedAt').nullable();
      c.string('reviewResult', { length: 32 }).nullable();
      c.text('reviewNote').nullable();
      c.string('registrarId', { length: 64 }).nullable();
      c.string('registrarName', { length: 200 }).nullable();
      c.datetimeTz('registeredAt').nullable();
      c.datetimeTz('releasedAt').nullable();
      c.text('releaseNote').nullable();
    });
    await builder.createCollection('lifecycleTransitions', (c) => {
      c.increments('id');
      c.string('lifecycle').notNull();
      c.string('recordId').notNull();
      c.string('transition').notNull();
      c.string('from').nullable();
      c.string('to').notNull();
      c.string('actorId').notNull();
      c.json('input').notNull();
      c.datetimeTz('at').notNull();
      c.integer('version').notNull();
      c.string('requestId').nullable();
      c.string('requestKey').notNull();
      c.unique(['lifecycle', 'recordId', 'version']);
      c.unique(['lifecycle', 'recordId', 'requestKey']);
      c.index(['lifecycle', 'recordId', 'id']);
    });
    await builder.createCollection('lifecycleEffectRuns', (c) => {
      c.increments('id');
      c.string('transitionId').notNull();
      c.string('lifecycle').notNull();
      c.string('recordId').notNull();
      c.string('effect').notNull();
      c.boolean('stayBound').notNull();
      c.string('status').notNull();
      c.integer('attempts', { defaultValue: 0 }).notNull();
      c.integer('maxAttempts', { defaultValue: 1 }).notNull();
      c.json('result').nullable();
      c.text('error').nullable();
      c.datetimeTz('createdAt').notNull();
      c.datetimeTz('updatedAt').notNull();
      c.datetimeTz('claimedAt').nullable();
      c.datetimeTz('runAfter').nullable();
      c.json('continuation').nullable();
      c.datetimeTz('continuationDueAt').nullable();
      c.datetimeTz('continuationAbandonedAt').nullable();
      c.index(['status', 'id']);
      c.index(['lifecycle', 'recordId', 'id']);
      c.index('continuationDueAt');
      c.index('continuationAbandonedAt');
    });
  },
  async down({ builder }) {
    await builder.dropCollection('lifecycleEffectRuns');
    await builder.dropCollection('lifecycleTransitions');
    await builder.dropCollection('releaseRequests');
  },
});
export default migration;
